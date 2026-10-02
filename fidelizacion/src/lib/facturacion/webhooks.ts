import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { esNoEncontradoMp, obtenerCuotaMp, obtenerPagoMp, obtenerSuscripcionMp } from "./mp";
import { estadoInicial, type EstadoSuscripcion } from "./estado";
import { efectoDeCuota, estadoDesdePreapproval, estadoTrasCuota } from "./transiciones";
import { pesosACentavos } from "./dinero";

/**
 * Procesamiento de los webhooks de Mercado Pago.
 *
 * Regla de oro: el webhook sólo dice "algo cambió en el recurso X". Nunca usamos
 * el cuerpo para decidir nada: consultamos el recurso a la API de MP y actuamos
 * según su estado REAL. Así da igual si el webhook llega duplicado, tarde, fuera
 * de orden o si alguien lo reenvía: el resultado es el mismo (idempotencia).
 */

type Suscripcion = { id: string; comercio_id: string; estado: EstadoSuscripcion; trial_ends_at: string | null };

const db = () => crearClienteAdmin();

async function suscripcionPorMp(mpId: string): Promise<Suscripcion | null> {
  const { data } = await db().from("suscripciones").select("id, comercio_id, estado, trial_ends_at").eq("mp_preapproval_id", mpId).maybeSingle();
  return (data as Suscripcion | null) ?? null;
}

async function aplicarCambio(s: Suscripcion, estado: EstadoSuscripcion, cambios: Record<string, unknown>, motivo: string) {
  const { error } = await db().rpc("aplicar_cambio_suscripcion", {
    p_suscripcion_id: s.id,
    p_estado: estado,
    p_cambios: cambios,
    p_motivo: motivo,
    p_origen: "webhook",
  });
  if (error) throw new Error(`aplicar_cambio_suscripcion: ${error.message}`);
}

/**
 * Suscripción que existe en MP pero no en nuestra base (el alta se cortó entre
 * "MP la creó" y "la guardamos"). La reconstruimos con external_reference
 * (= id del comercio) y el plan de MP.
 */
async function recuperarHuerfana(resp: Awaited<ReturnType<typeof obtenerSuscripcionMp>>): Promise<Suscripcion | null> {
  const comercioId = resp.external_reference;
  const planMpId = (resp as { preapproval_plan_id?: string }).preapproval_plan_id;
  if (!resp.id || !comercioId || !planMpId || !["authorized", "pending"].includes(resp.status ?? "")) return null;
  const admin = db();
  const [{ data: comercio }, { data: plan }] = await Promise.all([
    admin.from("comercios").select("id").eq("id", comercioId).maybeSingle(),
    admin.from("planes").select("id, precio_centavos, dias_prueba").eq("mp_preapproval_plan_id", planMpId).maybeSingle(),
  ]);
  if (!comercio || !plan) return null;
  const inicial = estadoInicial(resp, plan.dias_prueba);
  const { error } = await admin.rpc("registrar_alta_suscripcion", {
    p_comercio_id: comercio.id,
    p_plan_id: plan.id,
    p_mp_preapproval_id: resp.id,
    p_payer_email: resp.payer_email ?? null,
    p_precio_centavos: resp.auto_recurring?.transaction_amount != null ? pesosACentavos(resp.auto_recurring.transaction_amount) : plan.precio_centavos,
    p_estado: inicial.estado,
    p_trial_ends_at: inicial.trialEndsAt,
    p_current_period_end: inicial.currentPeriodEnd,
    p_actor: null,
  });
  if (error) throw new Error(`recuperar suscripción ${resp.id}: ${error.message}`);
  return suscripcionPorMp(resp.id);
}

async function aplicarPlanProgramado(suscripcionId: string) {
  const { error } = await db().rpc("aplicar_plan_programado", { p_suscripcion_id: suscripcionId });
  if (error) throw new Error(`aplicar_plan_programado: ${error.message}`);
}

/** topic subscription_preapproval: alta, pausa, reactivación, cancelación, cambio de monto o tarjeta. */
export async function procesarPreapproval(id: string): Promise<string> {
  const resp = await obtenerSuscripcionMp(id);
  let s = await suscripcionPorMp(id);
  if (!s) {
    s = await recuperarHuerfana(resp);
    if (!s) return `preapproval ${id} (${resp.status}) sin comercio conocido: ignorado`;
    return `preapproval ${id} recuperada (no estaba en la base)`;
  }
  await aplicarPlanProgramado(s.id);
  const nuevo = estadoDesdePreapproval(resp.status, s.estado, s.trial_ends_at);
  const cambios: Record<string, unknown> = {};
  if (resp.payer_email) cambios.mp_payer_email = resp.payer_email;
  if (resp.auto_recurring?.transaction_amount != null) cambios.precio_centavos = pesosACentavos(resp.auto_recurring.transaction_amount);
  // Mientras esté en prueba o activa, el fin del período es el próximo cobro que programó MP.
  if (resp.next_payment_date && (nuevo === "trialing" || nuevo === "authorized")) {
    cambios.current_period_end = resp.next_payment_date;
    if (nuevo === "trialing") cambios.trial_ends_at = resp.next_payment_date;
  }
  await aplicarCambio(s, nuevo, cambios, `MP: preapproval ${resp.status}`);
  return `preapproval ${id}: ${s.estado} → ${nuevo}`;
}

/** topic subscription_authorized_payment: una cuota mensual (programada, cobrada, en reintento...). */
export async function procesarCuota(id: string): Promise<string> {
  const cuota = await obtenerCuotaMp(id);
  if (!cuota.preapproval_id) return `cuota ${id} sin preapproval_id: ignorada`;
  let s = await suscripcionPorMp(cuota.preapproval_id);
  if (!s) {
    await procesarPreapproval(cuota.preapproval_id);
    s = await suscripcionPorMp(cuota.preapproval_id);
    if (!s) return `cuota ${id} de una suscripción desconocida: ignorada`;
  }

  const { error } = await db().rpc("registrar_cuota", {
    p_suscripcion_id: s.id,
    p_mp_authorized_payment_id: String(cuota.id ?? id),
    p_mp_payment_id: cuota.payment?.id ? String(cuota.payment.id) : "",
    p_monto_centavos: pesosACentavos(cuota.transaction_amount ?? 0),
    p_estado: cuota.status ?? "desconocido",
    p_estado_pago: cuota.payment?.status ?? null,
    p_status_detail: cuota.payment?.status_detail ?? null,
    p_intento: cuota.retry_attempt ?? 0,
    p_fecha_debito: cuota.debit_date ?? null,
    p_fecha_pago: cuota.payment?.status === "approved" ? (cuota.last_modified ?? new Date().toISOString()) : null,
  });
  if (error) throw new Error(`registrar_cuota: ${error.message}`);

  // Antes de extender el período: si había una bajada de plan programada, se aplica ahora.
  await aplicarPlanProgramado(s.id);
  const efecto = efectoDeCuota(cuota);
  const nuevo = estadoTrasCuota(s.estado, efecto);
  if (efecto.tipo === "sin_cambios") return `cuota ${id} (${cuota.status}): registrada, sin cambios`;

  const cambios: Record<string, unknown> = {};
  if (efecto.tipo === "cobrada") {
    // Cobrada: el período pago llega hasta el próximo cobro que programó MP.
    const pre = await obtenerSuscripcionMp(cuota.preapproval_id);
    if (pre.next_payment_date) cambios.current_period_end = pre.next_payment_date;
  }
  await aplicarCambio(s, nuevo, cambios, `MP: cuota ${cuota.status}${cuota.payment?.status ? ` / pago ${cuota.payment.status}` : ""}`);
  return `cuota ${id} (${efecto.tipo}): ${s.estado} → ${nuevo}`;
}

/** topic payment: por ahora sólo actualiza el estado del pago de una cuota (los del kit llegan en la fase 6). */
export async function procesarPago(id: string): Promise<string> {
  const pago = await obtenerPagoMp(id);
  const { data } = await db()
    .from("pagos_suscripcion")
    .update({ estado_pago: pago.status ?? null, status_detail: pago.status_detail ?? null })
    .eq("mp_payment_id", String(id))
    .select("id");
  if (data?.length) return `pago ${id} (${pago.status}): cuota actualizada`;
  return `pago ${id} (${pago.status}) sin cuota asociada: queda para la fase 6 (kit)`;
}

export async function procesarEvento(topic: string | null, dataId: string | null): Promise<string> {
  if (!dataId) return "sin data.id: ignorado";
  try {
    switch (topic) {
      case "subscription_preapproval":
        return await procesarPreapproval(dataId);
      case "subscription_authorized_payment":
        return await procesarCuota(dataId);
      case "payment":
        return await procesarPago(dataId);
      case "subscription_preapproval_plan":
        return "plan: sin acciones (los planes se editan desde /admin)";
      default:
        return `topic ${topic ?? "(vacío)"}: ignorado`;
    }
  } catch (e) {
    // Recurso inexistente (notificación de prueba del panel de MP, o de otra cuenta): no tiene sentido reintentar.
    if (esNoEncontradoMp(e)) return `${topic} ${dataId}: no existe en MP, ignorado`;
    throw e;
  }
}

/** Procesa un evento guardado en eventos_pago y deja el resultado (lo usa el webhook y "reprocesar" en /admin). */
export async function procesarEventoGuardado(eventoId: number): Promise<{ ok: boolean; resultado: string }> {
  const admin = db();
  const { data: ev } = await admin.from("eventos_pago").select("id, topic, data_id, firma_valida, intentos").eq("id", eventoId).single();
  if (!ev) return { ok: false, resultado: "evento inexistente" };
  if (!ev.firma_valida) return { ok: false, resultado: "firma inválida: no se procesa" };
  try {
    const resultado = await procesarEvento(ev.topic, ev.data_id);
    await admin.from("eventos_pago").update({ procesado_en: new Date().toISOString(), error: null, intentos: ev.intentos + 1 }).eq("id", ev.id);
    return { ok: true, resultado };
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    await admin.from("eventos_pago").update({ error: mensaje.slice(0, 1000), intentos: ev.intentos + 1 }).eq("id", ev.id);
    return { ok: false, resultado: mensaje };
  }
}
