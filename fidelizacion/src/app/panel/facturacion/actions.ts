"use server";

import { refresh } from "next/cache";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { requerirUsuario } from "@/lib/panel";
import { comercioDelUsuario, suscripcionVigente } from "@/lib/facturacion/comercio";
import { actualizarSuscripcionMp, asegurarPlanMp, crearSuscripcionMp } from "@/lib/facturacion/mp";
import { estadoInicial } from "@/lib/facturacion/estado";
import { decidirCambioPlan } from "@/lib/facturacion/cambio-plan";
import { leerLimites } from "@/lib/facturacion/planes";
import { centavosAPesos } from "@/lib/facturacion/dinero";
import { mensajeErrorMp, resumenErrorMp } from "@/lib/facturacion/errores-mp";

export type ResultadoAlta = { ok: true; destino: string } | { ok: false; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Alta de la suscripción: el navegador mandó un token de tarjeta (nunca el
 * número) y el plan elegido. El precio NO viene del navegador: se lee de la base.
 *
 * Orden de las operaciones (y por qué):
 *  1. Reservar el comercio en la base (evita dos altas a la vez → dos cobros).
 *  2. Crear la suscripción en Mercado Pago.
 *  3. Registrarla en la base (idempotente por mp_preapproval_id).
 * Si 2 sale bien y 3 falla, la suscripción existe en MP pero no acá: el webhook
 * (fase 3) y la reconciliación diaria (fase 7) la encuentran por external_reference.
 */
/** ¿Este comercio ya tuvo una suscripción paga (aunque esté cancelada)? Entonces ya usó su prueba gratis. */
async function yaTuvoSuscripcionPaga(comercioId: string): Promise<boolean> {
  const { count } = await crearClienteAdmin()
    .from("suscripciones")
    .select("id", { count: "exact", head: true })
    .eq("comercio_id", comercioId)
    .not("mp_preapproval_id", "is", null);
  return (count ?? 0) > 0;
}

export async function suscribirse(entrada: { comercioId: string; plan: string; token: string; email: string }): Promise<ResultadoAlta> {
  const { userId } = await requerirUsuario();
  const comercio = await comercioDelUsuario(entrada.comercioId);
  if (!comercio) return { ok: false, error: "No encontramos tu comercio." };

  const email = String(entrada.email ?? "").trim().toLowerCase();
  const token = String(entrada.token ?? "");
  if (!EMAIL.test(email)) return { ok: false, error: "Revisá el email del titular de la tarjeta." };
  if (!/^[A-Za-z0-9-]{16,100}$/.test(token)) return { ok: false, error: "Los datos de la tarjeta no llegaron bien. Cargala de nuevo." };

  const admin = crearClienteAdmin();
  const { data: plan } = await admin
    .from("planes")
    .select("id, codigo, nombre, precio_centavos, dias_prueba, mp_preapproval_plan_id")
    .eq("codigo", entrada.plan)
    .eq("activo", true)
    .maybeSingle();
  if (!plan) return { ok: false, error: "Ese plan no está disponible." };

  const { data: reservado } = await admin.rpc("reservar_alta_suscripcion", { p_comercio_id: comercio.id });
  if (!reservado) return { ok: false, error: "Tu suscripción ya está activa o se está activando. Recargá la página en unos segundos." };

  let mpId: string | undefined;
  try {
    // La prueba gratis es una sola vez por comercio: si ya tuvo una suscripción paga, arranca cobrando.
    const yaUsoPrueba = await yaTuvoSuscripcionPaga(comercio.id);
    const planMpId = yaUsoPrueba ? "" : await asegurarPlanMp(plan);
    const resp = await crearSuscripcionMp({
      planMpId,
      ...(yaUsoPrueba ? { sinPrueba: { precioCentavos: plan.precio_centavos } } : {}),
      comercioId: comercio.id,
      reason: `Point ${plan.nombre} · ${comercio.nombre}`,
      payerEmail: email,
      cardToken: token,
    });
    mpId = resp.id;
    if (!mpId) throw new Error("Mercado Pago no devolvió el id de la suscripción");

    const inicial = estadoInicial(resp, yaUsoPrueba ? 0 : plan.dias_prueba);
    const registrar = () =>
      admin.rpc("registrar_alta_suscripcion", {
        p_comercio_id: comercio.id,
        p_plan_id: plan.id,
        p_mp_preapproval_id: mpId,
        p_payer_email: email,
        p_precio_centavos: plan.precio_centavos,
        p_estado: inicial.estado,
        p_trial_ends_at: inicial.trialEndsAt,
        p_current_period_end: inicial.currentPeriodEnd,
        p_actor: userId,
      });
    // Un reintento: casi siempre es un corte momentáneo con la base (y es idempotente).
    let { error } = await registrar();
    if (error) ({ error } = await registrar());
    if (error) throw new Error(`registrar_alta_suscripcion: ${error.message}`);
  } catch (e) {
    if (mpId) {
      // Quedó creada en MP pero no en nuestra base. Si la dejáramos así y el
      // comercio reintentara, MP cobraría DOS suscripciones. Se cancela en MP.
      console.error(`SUSCRIPCIÓN SIN REGISTRAR: mp=${mpId} comercio=${comercio.id}`, e);
      try {
        await actualizarSuscripcionMp(mpId, { status: "cancelled" });
      } catch (eCancelar) {
        // No se pudo cancelar: NO se libera la reserva (no puede crear otra); el
        // webhook o la conciliación la recuperan y la registran.
        console.error(`No se pudo cancelar la suscripción huérfana ${mpId}`, resumenErrorMp(eCancelar));
        return { ok: false, error: "Tu tarjeta quedó registrada y estamos terminando de activar tu cuenta. Recargá en unos minutos." };
      }
      await admin.rpc("liberar_alta_suscripcion", { p_comercio_id: comercio.id });
      return { ok: false, error: "No pudimos terminar de activar tu cuenta y anulamos el intento (no se te va a cobrar). Probá de nuevo en un rato." };
    }
    await admin.rpc("liberar_alta_suscripcion", { p_comercio_id: comercio.id });
    console.error("Alta de suscripción fallida", comercio.id, resumenErrorMp(e));
    return { ok: false, error: mensajeErrorMp(e) };
  }

  const { data: local } = await admin.from("locales").select("slug").eq("comercio_id", comercio.id).order("created_at").limit(1).maybeSingle();
  return { ok: true, destino: local ? `/panel/${local.slug}?bienvenida=1` : "/panel" };
}

// ---------------------------------------------------------------- fase 4: gestionar

export type ResultadoGestion = { ok: true; mensaje: string } | { ok: false; error: string };
export type AccionSuscripcion = "pausar" | "reactivar" | "cancelar";

const PUEDE: Record<AccionSuscripcion, string[]> = {
  // En la prueba gratis no se pausa (no hay nada pago que "guardar"): pausar
  // dejaría sumar puntos sin que MP cobre nunca. Se cancela y listo.
  pausar: ["authorized"],
  reactivar: ["paused"],
  cancelar: ["pending", "trialing", "authorized", "past_due", "paused"],
};

/**
 * Pausar, reactivar o cancelar. Primero se cambia en Mercado Pago (que es quien
 * cobra) y recién si sale bien se registra acá; el webhook que llega después
 * repite el mismo cambio y no hace nada nuevo (idempotente).
 */
export async function gestionarSuscripcion(entrada: { comercioId: string; accion: AccionSuscripcion }): Promise<ResultadoGestion> {
  await requerirUsuario();
  const comercio = await comercioDelUsuario(entrada.comercioId);
  if (!comercio) return { ok: false, error: "No encontramos tu comercio." };
  const accion = entrada.accion;
  if (!(accion in PUEDE)) return { ok: false, error: "Acción inválida." };

  const s = await suscripcionVigente(comercio.id);
  if (!s?.mpPreapprovalId || !PUEDE[accion].includes(s.estado)) {
    return { ok: false, error: "Tu suscripción cambió. Recargá la página y probá de nuevo." };
  }

  const statusMp = accion === "pausar" ? "paused" : accion === "reactivar" ? "authorized" : "cancelled";
  try {
    await actualizarSuscripcionMp(s.mpPreapprovalId, { status: statusMp });
  } catch (e) {
    console.error(`No se pudo ${accion} en MP`, comercio.id, resumenErrorMp(e));
    return { ok: false, error: "Mercado Pago no respondió. Probá de nuevo en un momento." };
  }

  const nuevo =
    accion === "pausar"
      ? "paused"
      : accion === "cancelar"
        ? "cancelled"
        : s.trialEndsAt && new Date(s.trialEndsAt) > new Date()
          ? "trialing"
          : "authorized";
  const { error } = await crearClienteAdmin().rpc("aplicar_cambio_suscripcion", {
    p_suscripcion_id: s.id,
    p_estado: nuevo,
    p_cambios: {},
    p_motivo: `El dueño eligió ${accion} desde Facturación`,
    p_origen: "panel",
  });
  // Ya está hecho en MP: si falla acá, el webhook lo termina de registrar.
  if (error) console.error(`aplicar_cambio_suscripcion (${accion})`, comercio.id, error.message);
  refresh();
  const mensajes: Record<AccionSuscripcion, string> = {
    pausar: "Pausaste tu suscripción. No se te va a cobrar mientras esté pausada.",
    reactivar: "Reactivaste tu suscripción.",
    cancelar: "Cancelaste tu suscripción. No se te va a cobrar más.",
  };
  return { ok: true, mensaje: mensajes[accion] };
}

/**
 * Cambiar la tarjeta del débito. Si había un cobro fallido, Mercado Pago lo
 * reintenta con la tarjeta nueva en sus próximos intentos.
 */
export async function cambiarTarjeta(entrada: { comercioId: string; token: string }): Promise<ResultadoGestion> {
  await requerirUsuario();
  const comercio = await comercioDelUsuario(entrada.comercioId);
  if (!comercio) return { ok: false, error: "No encontramos tu comercio." };
  const token = String(entrada.token ?? "");
  if (!/^[A-Za-z0-9-]{16,100}$/.test(token)) return { ok: false, error: "Los datos de la tarjeta no llegaron bien. Cargala de nuevo." };

  const s = await suscripcionVigente(comercio.id);
  if (!s?.mpPreapprovalId || !["pending", "trialing", "authorized", "past_due", "paused"].includes(s.estado)) {
    return { ok: false, error: "Tu suscripción cambió. Recargá la página y probá de nuevo." };
  }
  try {
    await actualizarSuscripcionMp(s.mpPreapprovalId, { card_token_id: token });
  } catch (e) {
    console.error("Cambio de tarjeta fallido", comercio.id, resumenErrorMp(e));
    return { ok: false, error: mensajeErrorMp(e) };
  }
  const { error } = await crearClienteAdmin()
    .from("historial_suscripcion")
    .insert({ suscripcion_id: s.id, de_estado: s.estado, a_estado: s.estado, motivo: "Cambio de tarjeta", origen: "panel" });
  if (error) console.error("historial cambio de tarjeta", error.message);
  refresh();
  return {
    ok: true,
    mensaje: s.estado === "past_due" ? "Listo. Mercado Pago va a reintentar el cobro con la tarjeta nueva." : "Listo, actualizamos tu tarjeta.",
  };
}

// ---------------------------------------------------------------- fase 5: cambio de plan

/**
 * Cambio de plan sin prorrateo. Subir: inmediato. Bajar: al fin del período
 * (en prueba gratis, inmediato). Elegir el plan actual anula una bajada programada.
 * Primero se cambia el monto en MP (que es quien cobra), después la base.
 */
export async function cambiarPlan(entrada: { comercioId: string; plan: string }): Promise<ResultadoGestion> {
  const { userId } = await requerirUsuario();
  const comercio = await comercioDelUsuario(entrada.comercioId);
  if (!comercio) return { ok: false, error: "No encontramos tu comercio." };
  const s = await suscripcionVigente(comercio.id);
  if (!s?.mpPreapprovalId) return { ok: false, error: "Tu cuenta no tiene una suscripción paga para cambiar." };

  const admin = crearClienteAdmin();
  const [{ data: destino }, { data: actual }, { count: locales }] = await Promise.all([
    admin.from("planes").select("id, codigo, nombre, precio_centavos, limites").eq("codigo", entrada.plan).eq("activo", true).maybeSingle(),
    admin.from("planes").select("id, precio_centavos").eq("id", s.planId).single(),
    admin.from("locales").select("id", { count: "exact", head: true }).eq("comercio_id", comercio.id),
  ]);
  if (!destino || !actual) return { ok: false, error: "Ese plan no está disponible." };

  const anulando = destino.id === s.planId;
  if (anulando && !s.planProgramado) return { ok: false, error: "Ya estás en ese plan." };
  if (anulando && s.estado !== "trialing" && s.estado !== "authorized") return { ok: false, error: "Tu suscripción no permite cambiar de plan ahora." };

  let inmediato = false;
  if (!anulando) {
    const d = decidirCambioPlan({
      estado: s.estado,
      precioActual: actual.precio_centavos,
      precioNuevo: destino.precio_centavos,
      locales: locales ?? 1,
      localesNuevo: leerLimites(destino.limites).locales,
    });
    if (!d.ok) return { ok: false, error: d.error };
    inmediato = d.inmediato;
  }

  // El próximo débito se cobra con el precio del plan elegido (sin prorrateo).
  try {
    await actualizarSuscripcionMp(s.mpPreapprovalId, {
      auto_recurring: { transaction_amount: centavosAPesos(destino.precio_centavos), currency_id: "ARS" },
    });
  } catch (e) {
    console.error("Cambio de monto en MP fallido", comercio.id, resumenErrorMp(e));
    return { ok: false, error: "Mercado Pago no respondió. Probá de nuevo en un momento." };
  }

  const { data: resultado, error } = await admin.rpc("cambiar_plan_suscripcion", {
    p_suscripcion_id: s.id,
    p_plan_id: destino.id,
    p_inmediato: inmediato,
    p_precio_centavos: destino.precio_centavos,
    p_actor: userId,
  });
  if (error) {
    // MP ya tiene el monto nuevo y la base no: lo dejamos registrado para revisarlo.
    console.error(`CAMBIO DE PLAN A MEDIAS: comercio=${comercio.id} plan=${destino.codigo}`, error.message);
    return { ok: false, error: "No pudimos terminar el cambio. Ya estamos avisados; probá de nuevo en un rato." };
  }
  refresh();
  if (resultado === "anulado") return { ok: true, mensaje: `Listo: seguís en el plan ${destino.nombre}.` };
  if (resultado === "programado") return { ok: true, mensaje: `Listo: al terminar tu período pasás al plan ${destino.nombre}.` };
  return { ok: true, mensaje: `¡Listo! Ya estás en el plan ${destino.nombre}.` };
}

/**
 * Errores del formulario de tarjeta de MP (Brick). Pasan en el navegador, antes
 * de llegar a nosotros: los registramos acá para poder verlos en los logs.
 * Sólo el tipo y el mensaje (nunca datos de la tarjeta).
 */
export async function reportarErrorBrick(detalle: { type?: string; cause?: string; message?: string }) {
  const limpio = (v: unknown) => String(v ?? "").slice(0, 200);
  console.error("Brick de tarjeta (navegador):", limpio(detalle?.type), limpio(detalle?.cause), limpio(detalle?.message));
}
