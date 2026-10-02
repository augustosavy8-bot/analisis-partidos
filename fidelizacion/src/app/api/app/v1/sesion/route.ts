import { crearClienteAdmin } from "@/lib/supabase/admin";
import { normalizarWhatsapp } from "@/lib/whatsapp";
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
 * Ingreso a la app con el WhatsApp (igual que "Recuperá tu tarjeta" en la web):
 * devuelve un token de dispositivo. La tarjeta se crea siempre en el local, con el
 * primer toque del llavero; la app sólo entra a tarjetas que ya existen.
 */
export async function POST(req: Request) {
  if (!(await ingresoPermitido(req))) return error("Hiciste muchos intentos. Esperá unos minutos y probá de nuevo.", 429);
  const cuerpo = (await req.json().catch(() => null)) as { whatsapp?: unknown } | null;
  const whatsapp = typeof cuerpo?.whatsapp === "string" ? normalizarWhatsapp(cuerpo.whatsapp) : null;
  if (!whatsapp) return error("Revisá el número de WhatsApp (con código de área).", 400);
  if (!(await numeroPermitido(whatsapp))) return error("Hubo muchos ingresos con este número. Probá de nuevo mañana.", 429);

  const { data: cliente } = await crearClienteAdmin().from("clientes").select("id, nombre").eq("whatsapp", whatsapp).maybeSingle();
  await Promise.all([registrarIntento(req, !!cliente), registrarIntentoNumero(whatsapp, !!cliente)]);
  if (!cliente) {
    return error("No encontramos tarjetas con ese WhatsApp. Tu tarjeta se crea la primera vez que sumás en un local adherido.", 404);
  }
  const token = await nuevoDispositivoApp(cliente.id, req.headers.get("user-agent") ?? "iOS");
  return json({ token, nombre: cliente.nombre });
}

/** Cerrar sesión: revoca el token de este celular. */
export async function DELETE(req: Request) {
  await revocarDispositivo(req);
  return json({ ok: true });
}
