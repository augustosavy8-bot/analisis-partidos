/**
 * Plata en Point: siempre en CENTAVOS enteros (1500000 = $15.000).
 *
 * Por qué: los números con coma (float) no representan bien los decimales
 * (0.1 + 0.2 = 0.30000000000000004). Sumar precios así termina en diferencias
 * de un centavo que después no cierran contra lo que cobró Mercado Pago.
 * Con enteros la suma es exacta; sólo al hablar con MP (que usa pesos con
 * decimales en `transaction_amount` / `unit_price`) convertimos.
 */

function esCentavos(n: unknown): n is number {
  return typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
}

/** Centavos → pesos para la API de Mercado Pago (15000.5). */
export function centavosAPesos(centavos: number): number {
  if (!esCentavos(centavos)) throw new Error(`Monto inválido: ${centavos}`);
  return centavos / 100;
}

/** Pesos (lo que devuelve MP) → centavos. Redondea para absorber el error del float. */
export function pesosACentavos(pesos: number): number {
  if (typeof pesos !== "number" || !Number.isFinite(pesos) || pesos < 0) throw new Error(`Monto inválido: ${pesos}`);
  return Math.round(pesos * 100);
}

/**
 * Lee un monto escrito a mano en formato argentino ("25.000", "25000", "25.000,50")
 * y lo pasa a centavos. null si no se entiende (en vez de adivinar: "25000.50"
 * no se toma como 2.500.050).
 */
export function leerPesos(texto: string): number | null {
  const t = texto.trim().replace(/\s|\$/g, "");
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(t) && !/^\d+(,\d{1,2})?$/.test(t)) return null;
  const n = Number(t.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

const FORMATO_ENTERO = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const FORMATO_DECIMAL = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "$15.000" (o "$15.000,50" si tiene centavos). */
export function formatearPesos(centavos: number): string {
  const pesos = centavos / 100;
  return `$${centavos % 100 === 0 ? FORMATO_ENTERO.format(pesos) : FORMATO_DECIMAL.format(pesos)}`;
}
