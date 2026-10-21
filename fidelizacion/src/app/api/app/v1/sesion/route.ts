import { crearClienteAdmin } from "@/lib/supabase/admin";
import { normalizarWhatsapp } from "@/lib/whatsapp";
import { MENSAJE_OTRO_LOCAL, vinculoPermitido } from "@/lib/vinculo";
import { aplicarToqueApp, ErrorToque, usarToquePendiente } from "@/lib/app/toque-app";
import {
  error,
  ingresoPermitido,
  json,
  numeroPermitido,
  nuevoDispositivoApp,
  registrarIntento,
  registrarIntentoNumero,
  revocarDispositivo,
} from "@/lib/app/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ingreso a la app con el WhatsApp (igual que "Recuperá tu tarjeta" en la web).
 * Exige el toque firmado que devolvió /toque, de un solo uso: hay que estar en el
 * local con el llavero. Sin eso, cualquiera que supiera un número podía entrar a
 * la tarjeta ajena (y hasta borrarla). Devuelve el token y el resultado del toque.
 */
export async function POST(req: Request) {
  if (!(await ingresoPermitido(req))) return error("Hiciste muchos intentos. Esperá unos minutos y probá de nuevo.", 429);
  const cuerpo = (await req.json().catch(() => null)) as { whatsapp?: unknown; toquePendiente?: unknown } | null;
  const whatsapp = typeof cuerpo?.whatsapp === "string" ? normalizarWhatsapp(cuerpo.whatsapp) : null;
  if (!whatsapp) return error("Revisá el número de WhatsApp (con código de área).", 400);
  if (typeof cuerpo?.toquePendiente !== "string") {
    return error("Para entrar, pedile a quien te atiende que apoye el llavero en tu celular.", 403);
  }

  try {
    // Primero el toque (de un solo uso): sin estar en el local con el llavero no se
    // averigua si un número es cliente ni se gasta el cupo diario de ese número.
    const toque = await usarToquePendiente(cuerpo.toquePendiente);
    if (!(await numeroPermitido(whatsapp))) return error("Hubo muchos ingresos con este número. Probá de nuevo mañana.", 429);
    const { data: cliente } = await crearClienteAdmin().from("clientes").select("id, nombre").eq("whatsapp", whatsapp).maybeSingle();
    await Promise.all([registrarIntento(req, !!cliente), registrarIntentoNumero(whatsapp, !!cliente)]);
    if (!cliente) {
      return error("No encontramos tarjetas con ese WhatsApp. Tu tarjeta se crea la primera vez que sumás en un local adherido.", 404);
    }
    if ((await vinculoPermitido(whatsapp, toque.localId)) === "otro_local") return error(MENSAJE_OTRO_LOCAL, 403);
    const token = await nuevoDispositivoApp(cliente.id, req.headers.get("user-agent") ?? "iOS");
    const respuesta = await aplicarToqueApp(cliente.id, toque);
    return json({ token, nombre: cliente.nombre, ...respuesta });
  } catch (e) {
    if (e instanceof ErrorToque) return json({ error: e.message, titulo: e.titulo, motivo: e.motivo }, e.status);
    console.error("App: no se pudo entrar", e instanceof Error ? e.message : "error");
    return error("No pudimos entrar. Pedile que vuelva a apoyar el llavero.", 500);
  }
}

/** Cerrar sesión: revoca el token de este celular. */
export async function DELETE(req: Request) {
  await revocarDispositivo(req);
  return json({ ok: true });
}
