import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { firmar, verificarFirma } from "@/lib/firmas";
import { enviarMail } from "@/lib/mail";
import { armarMailResumen, textoSemana, type DatosResumen } from "@/lib/resumen";

const ZONA = "America/Argentina/Buenos_Aires";

/**
 * Links de baja del mail (firmados, sirven un año y sólo para ese dueño y ese local):
 * `pagina` para el pie del mail; `unClic` para el List-Unsubscribe de Gmail/Outlook.
 */
export function linksBaja(userId: string, localId: string) {
  const t = encodeURIComponent(firmar("baja", { u: userId, l: localId, exp: Math.floor(Date.now() / 1000) + 365 * 86_400 }, env.hmacSecret));
  return { pagina: `${env.appUrl}/resumen/baja?t=${t}`, unClic: `${env.appUrl}/api/resumen/baja?t=${t}` };
}

export function leerBaja(token: string | undefined) {
  return verificarFirma<{ u: string; l: string; exp: number }>("baja", token, env.hmacSecret);
}

/** Da de baja (o vuelve a activar) el resumen de un dueño en un local. */
export async function cambiarResumen(userId: string, localId: string, recibir: boolean) {
  const { error } = await crearClienteAdmin()
    .from("miembros_local")
    .update({ resumen_semanal: recibir })
    .eq("user_id", userId)
    .eq("local_id", localId);
  return !error;
}

/** ¿Es lunes en Argentina? */
export function esLunes(ahora: Date) {
  return new Intl.DateTimeFormat("en-US", { timeZone: ZONA, weekday: "short" }).format(ahora) === "Mon";
}

/** Medianoche (Argentina) del día de `ahora`: el resumen cubre los 7 días anteriores. */
function inicioDelDia(ahora: Date) {
  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(ahora); // AAAA-MM-DD
  return { dia, hasta: new Date(`${dia}T00:00:00-03:00`) };
}

/**
 * Manda el resumen de la semana a cada dueño de cada local activo. Un local por
 * semana: se anota antes de mandar, así si el cron corre dos veces no se repite.
 * Los locales sin clientes no reciben nada (no hay nada que contar).
 */
export async function enviarResumenes(ahora = new Date()) {
  const reporte = { locales: 0, mails: 0, fallidos: 0, salteados: 0 };
  if (!env.mail) return { ...reporte, error: "Faltan RESEND_API_KEY o MAIL_DESDE" };
  const db = crearClienteAdmin();
  const { dia, hasta } = inicioDelDia(ahora);
  const semana = textoSemana(hasta, ZONA);

  const { data: filas, error } = await db.rpc("destinatarios_resumen");
  if (error) return { ...reporte, error: error.message };
  const porLocal = new Map<string, { nombre: string; slug: string; dest: { userId: string; email: string }[] }>();
  for (const f of (filas ?? []) as { local_id: string; local_nombre: string; local_slug: string; user_id: string; email: string }[]) {
    const l = porLocal.get(f.local_id) ?? { nombre: f.local_nombre, slug: f.local_slug, dest: [] };
    l.dest.push({ userId: f.user_id, email: f.email });
    porLocal.set(f.local_id, l);
  }

  for (const [localId, l] of porLocal) {
    const { data: datos } = await db.rpc("resumen_semanal", { p_local_id: localId, p_hasta: hasta.toISOString() });
    const d = datos as DatosResumen | null;
    if (!d || d.clientes_total === 0) {
      reporte.salteados++;
      continue;
    }
    // Reserva la semana: si ya estaba, otro cron ya lo mandó.
    const { data: reserva } = await db
      .from("resumenes_semanales")
      .upsert({ local_id: localId, semana: dia, destinatarios: l.dest.length }, { onConflict: "local_id,semana", ignoreDuplicates: true })
      .select("local_id");
    if (!reserva?.length) {
      reporte.salteados++;
      continue;
    }
    reporte.locales++;
    for (const dest of l.dest) {
      const baja = linksBaja(dest.userId, localId);
      const mail = armarMailResumen({
        local: l.nombre,
        semana,
        datos: d,
        urlPanel: `${env.appUrl}/panel/${l.slug}`,
        urlReactivar: `${env.appUrl}/panel/${l.slug}/whatsapp`,
        urlBaja: baja.pagina,
      });
      const ok = await enviarMail({ para: dest.email, ...mail, baja: baja.unClic, idempotencia: `resumen-${localId}-${dia}-${dest.userId}` });
      if (ok) reporte.mails++;
      else reporte.fallidos++;
    }
  }
  return reporte;
}
