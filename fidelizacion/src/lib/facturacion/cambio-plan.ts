/**
 * Reglas del cambio de plan (sin prorrateo). Función pura, testeada; la base
 * vuelve a validar el estado (cambiar_plan_suscripcion).
 *
 *  - En prueba gratis: inmediato (todavía no pagó nada).
 *  - Subir de precio: inmediato; el próximo débito ya es con el precio nuevo.
 *  - Bajar de precio: al fin del período pago (ya pagó el plan caro este mes).
 */
import type { EstadoSuscripcion } from "./estado";

export type DecisionCambio = { ok: true; inmediato: boolean } | { ok: false; error: string };

export function decidirCambioPlan(p: {
  estado: EstadoSuscripcion;
  precioActual: number;
  precioNuevo: number;
  /** Locales que tiene hoy el comercio y los que permite el plan nuevo (null = ilimitados). */
  locales: number;
  localesNuevo: number | null;
}): DecisionCambio {
  if (p.estado === "past_due") return { ok: false, error: "Primero regularizá el pago pendiente; después podés cambiar de plan." };
  if (p.estado === "paused") return { ok: false, error: "Reactivá tu suscripción para cambiar de plan." };
  if (p.estado !== "trialing" && p.estado !== "authorized") return { ok: false, error: "Tu suscripción no permite cambiar de plan ahora." };
  if (p.localesNuevo !== null && p.locales > p.localesNuevo) {
    return { ok: false, error: `Tenés ${p.locales} locales y ese plan incluye ${p.localesNuevo}. Escribinos y te ayudamos a pasar.` };
  }
  if (p.estado === "trialing") return { ok: true, inmediato: true };
  return { ok: true, inmediato: p.precioNuevo >= p.precioActual };
}
