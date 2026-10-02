import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { verificarFirmaMp } from "@/lib/facturacion/firma";
import { procesarEventoGuardado } from "@/lib/facturacion/webhooks";

export const runtime = "nodejs";

/**
 * Webhook de Mercado Pago (configurado en Tus integraciones → Webhooks).
 *
 * 1. Validamos la firma x-signature. Si no es de MP → 401: no se guarda ni se
 *    procesa (si se guardara, cualquiera podría llenar la tabla).
 * 2. Guardamos la notificación cruda en eventos_pago.
 * 3. Procesamos: consultamos el recurso a la API y actualizamos la base.
 * 4. Respondemos 200 si salió bien. Si falló algo nuestro (base caída, MP lento)
 *    respondemos 500: MP reintenta cada 15 minutos, y como el procesamiento es
 *    idempotente, reintentar es seguro. MP espera la respuesta en menos de 22 s.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  if (Number(req.headers.get("content-length") ?? 0) > 64 * 1024) return NextResponse.json({ ok: false }, { status: 413 });
  const texto = (await req.text()).slice(0, 64 * 1024);
  let cuerpo: Record<string, unknown> = {};
  try {
    cuerpo = texto ? JSON.parse(texto) : {};
  } catch {
    cuerpo = { _no_json: texto.slice(0, 2000) };
  }

  const datos = (cuerpo.data ?? {}) as { id?: string | number };
  const dataId = url.searchParams.get("data.id") ?? (datos.id != null ? String(datos.id) : null) ?? url.searchParams.get("id");
  const topic = (cuerpo.type as string | undefined) ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const xRequestId = req.headers.get("x-request-id");

  let firmaValida = false;
  try {
    firmaValida = verificarFirmaMp({ xSignature: req.headers.get("x-signature"), xRequestId, dataId: url.searchParams.get("data.id"), secreto: env.mpWebhookSecret }).valida;
  } catch {
    firmaValida = false; // sin MP_WEBHOOK_SECRET configurado: nada es válido
  }

  if (!firmaValida) {
    console.warn(`Webhook MP con firma inválida (topic=${topic}, data.id=${dataId})`);
    return NextResponse.json({ ok: false, error: "firma inválida" }, { status: 401 });
  }

  const { data: evento, error } = await crearClienteAdmin()
    .from("eventos_pago")
    .insert({
      topic,
      action: (cuerpo.action as string | undefined) ?? null,
      data_id: dataId,
      x_request_id: xRequestId,
      firma_valida: firmaValida,
      raw: { query: Object.fromEntries(url.searchParams), body: cuerpo },
    })
    .select("id")
    .single();
  if (error || !evento) {
    console.error("Webhook MP: no se pudo guardar el evento", error?.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const r = await procesarEventoGuardado(evento.id);
  if (!r.ok) console.error(`Webhook MP evento ${evento.id} falló:`, r.resultado);
  return NextResponse.json({ ok: r.ok, evento: evento.id }, { status: r.ok ? 200 : 500 });
}
