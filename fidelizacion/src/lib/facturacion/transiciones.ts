/**
 * Máquina de estados de la suscripción (funciones puras, testeadas).
 *
 * Fuentes de verdad:
 *  - El `preapproval` de MP dice si la suscripción existe, está pausada o cancelada.
 *  - Cada cuota (`authorized_payment`) dice si se cobró o no.
 * Nuestro estado combina las dos: MP no tiene "past_due" ni "trialing".
 */
import type { EstadoSuscripcion } from "./estado";

/** Transiciones permitidas. `cancelled` es terminal (en MP también es irreversible). */
const TRANSICIONES: Record<EstadoSuscripcion, EstadoSuscripcion[]> = {
  cortesia: ["cancelled"],
  pending: ["trialing", "authorized", "paused", "cancelled"],
  trialing: ["authorized", "past_due", "paused", "cancelled"],
  authorized: ["past_due", "paused", "cancelled"],
  past_due: ["authorized", "paused", "cancelled"],
  paused: ["trialing", "authorized", "past_due", "cancelled"],
  cancelled: [],
};

export function puedeTransicionar(de: EstadoSuscripcion, a: EstadoSuscripcion): boolean {
  return de === a || TRANSICIONES[de].includes(a);
}

/**
 * Estado nuestro a partir del `status` del preapproval. Sólo decide lo que el
 * preapproval sabe (pausa, cancelación, reactivación); el cobro de cada mes lo
 * decide la cuota.
 */
export function estadoDesdePreapproval(
  statusMp: string | null | undefined,
  actual: EstadoSuscripcion,
  trialEndsAt: string | null,
  ahora: Date = new Date(),
): EstadoSuscripcion {
  if (actual === "cancelled" || actual === "cortesia") return actual;
  switch (statusMp) {
    case "cancelled":
      return "cancelled";
    case "paused":
      return "paused";
    case "authorized":
      // Recién autorizada o reactivada: prueba si todavía no terminó, si no activa.
      if (actual === "pending" || actual === "paused") {
        return trialEndsAt && new Date(trialEndsAt) > ahora ? "trialing" : "authorized";
      }
      // trialing / authorized / past_due: lo cambia el resultado de las cuotas.
      return actual;
    default:
      return actual;
  }
}

export type CuotaMp = {
  status?: string | null; // scheduled | processed | recycling | cancelled | "waiting for gateway"
  payment?: { id?: string | number | null; status?: string | null } | null;
};

export type EfectoCuota =
  | { tipo: "cobrada" }
  | { tipo: "fallida" }
  | { tipo: "sin_cambios" };

/**
 * Qué significa una cuota para la suscripción:
 * - pago aprobado → cobrada (vuelve o sigue activa, se extiende el período).
 * - en reintento (`recycling`) o pago rechazado → fallida (past_due).
 * - programada, esperando al banco o cancelada → sin cambios.
 */
export function efectoDeCuota(c: CuotaMp): EfectoCuota {
  const pago = c.payment?.status ?? null;
  if (pago === "approved" || pago === "authorized") return { tipo: "cobrada" };
  if (c.status === "recycling") return { tipo: "fallida" };
  if (c.status === "processed" && pago && ["rejected", "cancelled"].includes(pago)) return { tipo: "fallida" };
  return { tipo: "sin_cambios" };
}

/** Estado resultante de aplicar una cuota (respeta las transiciones permitidas). */
export function estadoTrasCuota(actual: EstadoSuscripcion, efecto: EfectoCuota): EstadoSuscripcion {
  if (efecto.tipo === "sin_cambios") return actual;
  const destino: EstadoSuscripcion = efecto.tipo === "cobrada" ? "authorized" : "past_due";
  // Una cuota vieja que llega tarde no resucita una suscripción cancelada ni pausada.
  if (actual === "cancelled" || actual === "paused" || actual === "cortesia") return actual;
  return puedeTransicionar(actual, destino) ? destino : actual;
}
