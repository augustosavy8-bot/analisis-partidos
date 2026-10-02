import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { verificarFirmaMp } from "@/lib/facturacion/firma";
import { procesarEventoGuardado } from "@/lib/facturacion/webhooks";

export const runtime = "nodejs";

/**
 * Webhook de Mercado Pago (configurado en Tus integraciones → Webhooks).
 *
 * 1. Guardamos SIEMPRE la notificación cruda en eventos_pago (firma válida o no).
 * 2. Validamos la firma x-signature. Si no es de MP → 401 y no se procesa.
 * 3. Procesamos: consultamos el recurso a la API y actualizamos la base.
 * 4. Respondemos 200 si salió bien. Si falló algo nuestro (base caída, MP lento)
 *    respondemos 500: MP reintenta cada 15 minutos, y como el procesamiento es
 *    idempotente, reintentar es seguro. MP espera la respuesta en menos de 22 s.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const texto = await req.text();
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

  if (!firmaValida) return NextResponse.json({ ok: false, error: "firma inválida" }, { status: 401 });

  const r = await procesarEventoGuardado(evento.id);
  if (!r.ok) console.error(`Webhook MP evento ${evento.id} falló:`, r.resultado);
  return NextResponse.json({ ok: r.ok, evento: evento.id }, { status: r.ok ? 200 : 500 });
}
