"use server";

import { requerirSuperadmin } from "@/lib/admin";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { enviarMail } from "@/lib/mail";
import { esIdMailDueno, MAILS_DUENOS, type IdMailDueno } from "@/lib/anuncio";

export type ResultadoAnuncio = { error?: string; enviados?: number; fallidos?: number };

/** Emails de los dueños de locales activos (sin repetir). */
async function emailsDuenos(): Promise<string[]> {
  const { data, error } = await crearClienteAdmin().rpc("destinatarios_resumen");
  if (error) throw new Error(error.message);
  return [...new Set(((data ?? []) as { email: string }[]).map((d) => d.email.toLowerCase()))];
}

export async function contarDestinatarios() {
  await requerirSuperadmin();
  return (await emailsDuenos()).length;
}

/**
 * `prueba`: sólo a tu mail. Si no, a todos los dueños. La clave de idempotencia
 * evita que Resend lo mande dos veces a la misma persona (en 24 hs).
 */
export async function mandarAnuncio(id: IdMailDueno, prueba: boolean): Promise<ResultadoAnuncio> {
  const { email } = await requerirSuperadmin();
  if (!esIdMailDueno(id)) return { error: "Mail desconocido." };
  if (!env.mail) return { error: "Faltan RESEND_API_KEY o MAIL_DESDE en Vercel." };
  const mail = MAILS_DUENOS[id].armar(`${env.appUrl}/panel`);
  const para = prueba ? [email] : await emailsDuenos();
  if (!para.length) return { error: prueba ? "Tu usuario no tiene email." : "No hay dueños para mandarle." };
  let enviados = 0;
  let fallidos = 0;
  for (const e of para) {
    const ok = await enviarMail({ para: e, ...mail, idempotencia: prueba ? undefined : `${id}-2026-10-${e}` });
    if (ok) enviados++;
    else fallidos++;
  }
  return { enviados, fallidos };
}
