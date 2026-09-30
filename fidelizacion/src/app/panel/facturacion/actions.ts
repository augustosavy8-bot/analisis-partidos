"use server";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { requerirUsuario } from "@/lib/panel";
import { comercioDelUsuario } from "@/lib/facturacion/comercio";
import { asegurarPlanMp, crearSuscripcionMp } from "@/lib/facturacion/mp";
import { estadoInicial } from "@/lib/facturacion/estado";
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
    const planMpId = await asegurarPlanMp(plan);
    const resp = await crearSuscripcionMp({
      planMpId,
      comercioId: comercio.id,
      reason: `Point ${plan.nombre} · ${comercio.nombre}`,
      payerEmail: email,
      cardToken: token,
    });
    mpId = resp.id;
    if (!mpId) throw new Error("Mercado Pago no devolvió el id de la suscripción");

    const inicial = estadoInicial(resp, plan.dias_prueba);
    const { error } = await admin.rpc("registrar_alta_suscripcion", {
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
    if (error) throw new Error(`registrar_alta_suscripcion: ${error.message}`);
  } catch (e) {
    await admin.rpc("liberar_alta_suscripcion", { p_comercio_id: comercio.id });
    if (mpId) {
      // Quedó creada en MP pero no en nuestra base: lo va a recuperar el webhook.
      console.error(`SUSCRIPCIÓN SIN REGISTRAR: mp=${mpId} comercio=${comercio.id}`, e);
      return { ok: false, error: "Tu tarjeta quedó registrada y estamos terminando de activar tu cuenta. Recargá en un minuto." };
    }
    console.error("Alta de suscripción fallida", comercio.id, resumenErrorMp(e));
    return { ok: false, error: mensajeErrorMp(e) };
  }

  const { data: local } = await admin.from("locales").select("slug").eq("comercio_id", comercio.id).order("created_at").limit(1).maybeSingle();
  return { ok: true, destino: local ? `/panel/${local.slug}?bienvenida=1` : "/panel" };
}
