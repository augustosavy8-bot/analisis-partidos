import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { buscarPagosDePedidoMp } from "./mp";
import { procesarEventoGuardado, procesarPreapproval, registrarPagoDePedido } from "./webhooks";

export type ReporteConciliacion = {
  reservasLiberadas: number;
  planesAplicados: number;
  suscripcionesRevisadas: number;
  pedidosRevisados: number;
  eventosReprocesados: number;
  errores: string[];
};

/**
 * Conciliación diaria: no confiar sólo en los webhooks (pueden no llegar, o
 * llegar cuando la base estaba caída). Recorre lo que podría haber quedado
 * desactualizado y lo vuelve a consultar a Mercado Pago. Todo lo que llama es
 * idempotente: correrla dos veces no cambia nada.
 */
export async function conciliar(): Promise<ReporteConciliacion> {
  const db = crearClienteAdmin();
  const r: ReporteConciliacion = { reservasLiberadas: 0, planesAplicados: 0, suscripcionesRevisadas: 0, pedidosRevisados: 0, eventosReprocesados: 0, errores: [] };
  const anotar = (donde: string, e: unknown) => r.errores.push(`${donde}: ${e instanceof Error ? e.message : String(e)}`.slice(0, 300));

  // 1. Reservas de stock vencidas.
  const { data: liberadas, error: e1 } = await db.rpc("liberar_reservas_vencidas");
  if (e1) anotar("reservas", e1.message);
  else r.reservasLiberadas = liberadas ?? 0;

  // 2. Bajadas de plan programadas cuyo período ya terminó.
  const { data: programadas } = await db
    .from("suscripciones")
    .select("id")
    .not("plan_programado_id", "is", null)
    .lte("current_period_end", new Date().toISOString());
  for (const s of programadas ?? []) {
    const { data: ok, error } = await db.rpc("aplicar_plan_programado", { p_suscripcion_id: s.id });
    if (error) anotar(`plan programado ${s.id}`, error.message);
    else if (ok) r.planesAplicados++;
  }

  // 3. Suscripciones vivas: estado y próximo cobro según MP.
  const { data: vivas } = await db
    .from("suscripciones")
    .select("id, mp_preapproval_id")
    .not("mp_preapproval_id", "is", null)
    .in("estado", ["pending", "trialing", "authorized", "past_due", "paused"])
    .limit(200);
  for (const s of vivas ?? []) {
    try {
      await procesarPreapproval(s.mp_preapproval_id!);
      r.suscripcionesRevisadas++;
    } catch (e) {
      anotar(`suscripción ${s.id}`, e);
    }
  }

  // 4. Pedidos esperando el pago (o vencidos hace poco): ¿MP tiene un pago aprobado?
  const desde = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const { data: pedidos } = await db
    .from("pedidos")
    .select("id")
    .in("estado", ["pendiente_pago", "expirado"])
    .not("mp_preference_id", "is", null)
    .gte("created_at", desde)
    .limit(100);
  for (const p of pedidos ?? []) {
    try {
      for (const pago of await buscarPagosDePedidoMp(p.id)) {
        await registrarPagoDePedido(pago as Parameters<typeof registrarPagoDePedido>[0]);
      }
      r.pedidosRevisados++;
    } catch (e) {
      anotar(`pedido ${p.id}`, e);
    }
  }

  // 5. Webhooks que fallaron (firma válida, sin procesar, con menos de 5 intentos).
  const { data: eventos } = await db
    .from("eventos_pago")
    .select("id")
    .is("procesado_en", null)
    .eq("firma_valida", true)
    .lt("intentos", 5)
    .lte("created_at", new Date(Date.now() - 5 * 60_000).toISOString())
    .order("id")
    .limit(100);
  for (const ev of eventos ?? []) {
    const res = await procesarEventoGuardado(ev.id);
    if (res.ok) r.eventosReprocesados++;
    else anotar(`evento ${ev.id}`, res.resultado);
  }

  return r;
}
