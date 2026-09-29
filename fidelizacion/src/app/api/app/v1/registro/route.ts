import { headers } from "next/headers";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { nuevoTokenDispositivo } from "@/lib/dispositivo";
import { normalizarWhatsapp } from "@/lib/whatsapp";
import { guardarCumpleCliente } from "@/lib/tarjeta";
import { error, json } from "@/lib/app/servidor";
import { aplicarToqueApp, ErrorToque, usarToquePendiente } from "@/lib/app/toque-app";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Crear la tarjeta desde la app (igual que el formulario de la web después del
 * primer toque): hace falta el toque firmado que devolvió /toque, de un solo uso.
 * Devuelve el token de la sesión y el resultado del toque.
 */
export async function POST(req: Request) {
  const c = (await req.json().catch(() => null)) as {
    nombre?: unknown;
    whatsapp?: unknown;
    consentimiento?: unknown;
    cumple?: { dia?: unknown; mes?: unknown } | null;
    toquePendiente?: unknown;
  } | null;
  const nombre = typeof c?.nombre === "string" ? c.nombre.trim().replace(/\s+/g, " ") : "";
  const whatsapp = typeof c?.whatsapp === "string" ? normalizarWhatsapp(c.whatsapp) : null;
  const dia = Number(c?.cumple?.dia);
  const mes = Number(c?.cumple?.mes);
  const cumple = c?.cumple ? (Number.isInteger(dia) && Number.isInteger(mes) && dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12 ? { dia, mes } : "invalido") : null;

  if (nombre.length < 2 || nombre.length > 80) return error("Poné tu nombre.", 400);
  if (!whatsapp) return error("Revisá el número de WhatsApp (con código de área).", 400);
  if (cumple === "invalido") return error("Revisá tu cumple: elegí día y mes.", 400);
  if (c?.consentimiento !== true) return error("Para crear tu tarjeta tenés que aceptar la política de privacidad.", 400);

  try {
    const toque = await usarToquePendiente(c?.toquePendiente);
    const { token, hash } = nuevoTokenDispositivo();
    const ua = `Point app · ${(await headers()).get("user-agent") ?? "iOS"}`;
    const { data, error: e } = await crearClienteAdmin().rpc("alta_cliente", {
      p_nombre: nombre,
      p_whatsapp: whatsapp,
      p_local_id: toque.localId,
      p_token_hash: hash,
      p_user_agent: ua,
    });
    if (e || !data) throw new Error(e?.message ?? "alta_cliente sin datos");
    if (cumple) await guardarCumpleCliente(data.cliente_id, cumple.dia, cumple.mes);
    const respuesta = await aplicarToqueApp(data.cliente_id, toque);
    return json({ token, nombre, ...respuesta });
  } catch (e) {
    if (e instanceof ErrorToque) return json({ error: e.message, titulo: e.titulo, motivo: e.motivo }, e.status);
    console.error("App: no se pudo registrar", e instanceof Error ? e.message : "error");
    return error("No pudimos crear tu tarjeta. Pedile que vuelva a apoyar el llavero.", 500);
  }
}
