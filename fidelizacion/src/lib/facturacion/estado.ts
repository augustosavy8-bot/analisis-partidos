/**
 * Traducción de lo que responde Mercado Pago a nuestros estados (funciones
 * puras: se testean sin red). MP y nosotros no hablamos el mismo idioma:
 * para MP una suscripción en período de prueba está "authorized" (la tarjeta
 * quedó autorizada); para nosotros es "trialing" (todavía no se cobró nada).
 */

export type EstadoSuscripcion = "cortesia" | "trialing" | "pending" | "authorized" | "paused" | "past_due" | "cancelled";

type RespuestaAlta = { status?: string | null; next_payment_date?: string | null };

const DIA = 24 * 60 * 60 * 1000;

function fechaValida(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Suma meses de calendario (31/1 + 1 mes = 28 o 29/2, no 3/3). */
export function sumarMeses(fecha: Date, meses: number): Date {
  const d = new Date(fecha);
  const dia = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + meses);
  const ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(dia, ultimo));
  return d;
}

/**
 * Estado con el que guardamos una suscripción recién creada en MP.
 * - `authorized` con días de prueba → `trialing` hasta el primer cobro.
 * - `authorized` sin prueba → `authorized`, período hasta el próximo cobro.
 * - `pending` → `pending` (MP todavía no confirmó el medio de pago).
 * Preferimos `next_payment_date` de MP (la fuente de verdad del cobro); si no
 * viene, lo estimamos.
 */
export function estadoInicial(
  resp: RespuestaAlta,
  diasPrueba: number,
  ahora: Date = new Date(),
): { estado: "trialing" | "authorized" | "pending"; trialEndsAt: string | null; currentPeriodEnd: string | null } {
  const proximo = fechaValida(resp.next_payment_date);
  if (resp.status === "authorized") {
    if (diasPrueba > 0) {
      const fin = proximo ?? new Date(ahora.getTime() + diasPrueba * DIA);
      return { estado: "trialing", trialEndsAt: fin.toISOString(), currentPeriodEnd: fin.toISOString() };
    }
    return { estado: "authorized", trialEndsAt: null, currentPeriodEnd: (proximo ?? sumarMeses(ahora, 1)).toISOString() };
  }
  if (resp.status === "pending") return { estado: "pending", trialEndsAt: null, currentPeriodEnd: null };
  throw new Error(`Mercado Pago devolvió la suscripción en estado inesperado: ${resp.status ?? "(vacío)"}`);
}
