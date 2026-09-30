/**
 * Errores de la API de Mercado Pago → mensaje para el comercio. El SDK tira un
 * objeto con `message`, `status` y a veces `cause: [{ code, description }]`.
 * Nunca mostramos el detalle técnico al usuario; se loguea aparte.
 */
export type ErrorMp = { message?: string; status?: number; cause?: { code?: string | number; description?: string }[] | unknown };

function textoCompleto(e: ErrorMp): string {
  const causas = Array.isArray(e.cause) ? e.cause.map((c) => `${c?.code ?? ""} ${c?.description ?? ""}`).join(" ") : "";
  return `${e.message ?? ""} ${causas}`.toLowerCase();
}

export function mensajeErrorMp(error: unknown): string {
  const e = (error && typeof error === "object" ? error : {}) as ErrorMp;
  const t = textoCompleto(e);
  if (/card_token|token/.test(t) && /invalid|expired|not found|used/.test(t))
    return "Los datos de la tarjeta vencieron. Cargala de nuevo, por favor.";
  if (/rejected|rechaz|insufficient|disabled|call_for_authorize/.test(t))
    return "La tarjeta fue rechazada. Probá con otra o consultá con tu banco.";
  if (/test user|real users|different countries|collector/.test(t))
    return "Esta tarjeta o email no se pueden usar con esta cuenta de Mercado Pago (en pruebas, usá el email del usuario de prueba comprador).";
  if (/payer_email|email/.test(t)) return "Revisá el email del titular de la tarjeta.";
  if (e.status === 401 || e.status === 403) return "No pudimos conectarnos con Mercado Pago. Ya estamos avisados; probá en un rato.";
  return "No pudimos activar la suscripción. Probá de nuevo en un momento.";
}

/** Resumen seguro para los logs (sin tokens ni datos de tarjeta). */
export function resumenErrorMp(error: unknown): string {
  const e = (error && typeof error === "object" ? error : {}) as ErrorMp;
  const causas = Array.isArray(e.cause) ? e.cause.map((c) => `${c?.code ?? "?"}: ${c?.description ?? ""}`).join(" | ") : "";
  return `[MP ${e.status ?? "?"}] ${e.message ?? String(error)}${causas ? ` — ${causas}` : ""}`.slice(0, 500);
}
