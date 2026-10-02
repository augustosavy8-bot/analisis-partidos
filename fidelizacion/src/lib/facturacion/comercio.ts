import "server-only";
import { cache } from "react";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { requerirUsuario } from "@/lib/panel";
import { leerLimites, type LimitesPlan } from "./planes";
import type { EstadoSuscripcion } from "./estado";

export type ComercioPanel = { id: string; nombre: string; email_facturacion: string | null };

export type SuscripcionVigente = {
  id: string;
  estado: EstadoSuscripcion;
  planId: string;
  planCodigo: string;
  planNombre: string;
  limites: LimitesPlan;
  precioCentavos: number | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cortesiaHasta: string | null;
  cancelAtPeriodEnd: boolean;
  mpPayerEmail: string | null;
  pastDueDesde: string | null;
  mpPreapprovalId: string | null;
};

/**
 * Comercios que gestiona el usuario logueado (RLS decide cuáles). Con `id`
 * elige uno; sin `id`, el primero. null si no gestiona ninguno.
 */
export const comercioDelUsuario = cache(async (id?: string | null): Promise<ComercioPanel | null> => {
  const { db } = await requerirUsuario();
  let q = db.from("comercios").select("id, nombre, email_facturacion").order("created_at");
  if (id) q = q.eq("id", id);
  const { data } = await q.limit(1);
  return data?.[0] ?? null;
});

/**
 * Suscripción vigente del comercio, con su plan. Lectura con service role: sólo servidor.
 * La no cancelada manda; si no hay, una cancelada que todavía tiene período pago
 * por delante (canceló estando al día: usa lo que pagó hasta el final).
 */
export async function suscripcionVigente(comercioId: string): Promise<SuscripcionVigente | null> {
  const { data: filas, error } = await crearClienteAdmin()
    .from("suscripciones")
    .select("id, estado, plan_id, precio_centavos, trial_ends_at, current_period_end, cortesia_hasta, cancel_at_period_end, mp_payer_email, mp_preapproval_id, past_due_desde, planes!suscripciones_plan_id_fkey(codigo, nombre, limites)")
    .eq("comercio_id", comercioId)
    .or(`estado.neq.cancelled,current_period_end.gt."${new Date().toISOString()}"`)
    .order("created_at", { ascending: false })
    .limit(5);
  const data = filas?.find((f) => f.estado !== "cancelled") ?? filas?.[0] ?? null;
  // Un error acá NO es "no tiene suscripción": sería bloquear a un comercio que pagó.
  // suscripciones tiene dos FK a planes (plan_id y plan_programado_id): el embed
  // tiene que nombrar cuál, o PostgREST responde "más de una relación".
  if (error) throw new Error(`suscripcionVigente: ${error.message}`);
  if (!data) return null;
  const plan = data.planes as unknown as { codigo: string; nombre: string; limites: unknown };
  return {
    id: data.id,
    estado: data.estado as EstadoSuscripcion,
    planId: data.plan_id,
    planCodigo: plan.codigo,
    planNombre: plan.nombre,
    limites: leerLimites(plan.limites),
    precioCentavos: data.precio_centavos,
    trialEndsAt: data.trial_ends_at,
    currentPeriodEnd: data.current_period_end,
    cortesiaHasta: data.cortesia_hasta,
    cancelAtPeriodEnd: data.cancel_at_period_end,
    mpPayerEmail: data.mp_payer_email,
    pastDueDesde: data.past_due_desde,
    mpPreapprovalId: data.mp_preapproval_id,
  };
}
