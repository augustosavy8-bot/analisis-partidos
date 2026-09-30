/**
 * Medidas de la tarjeta y del carrusel (funciones puras: se usan en worklets y en tests).
 * La tarjeta es siempre horizontal (proporción de tarjeta real, 1.586); en el
 * carrusel se muestra girada 90°, así que su lado largo pasa a ser el alto.
 */
export const PROPORCION = 1.586;
export const RADIO_TARJETA = 20;
export const GAP_CARRUSEL = 16;

export type Rect = { x: number; y: number; width: number; height: number };

export function geometriaCarrusel(anchoPantalla: number, altoPantalla: number) {
  "worklet";
  // Alto visible de la tarjeta vertical: ~62% de la pantalla, sin tapar a las vecinas.
  const alto = Math.round(Math.min(altoPantalla * 0.62, anchoPantalla * 0.64 * PROPORCION));
  const ancho = Math.round(alto / PROPORCION);
  const paso = ancho + GAP_CARRUSEL;
  const arriba = Math.round(Math.max(90, (altoPantalla - alto) / 2 - 60));
  return { alto, ancho, paso, arriba, relleno: (anchoPantalla - ancho) / 2 };
}

/** Estilo de cada tarjeta del carrusel según su distancia al centro (en tarjetas). */
export function estiloPorDistancia(d: number) {
  "worklet";
  const c = Math.max(-1, Math.min(1, d));
  const a = Math.abs(c);
  return { escala: 1 - 0.15 * a, opacidad: 1 - 0.5 * a, rotacionY: -c * 22 };
}

/** Índice de la tarjeta centrada a partir del scroll. */
export function indiceCentrado(scrollX: number, paso: number, total: number) {
  "worklet";
  return Math.max(0, Math.min(total - 1, Math.round(scrollX / paso)));
}

/**
 * Transform de la tarjeta que "vuela" entre el home (horizontal) y el centro del
 * carrusel (vertical). p = 0 en el home, p = 1 en el carrusel. La tarjeta mide
 * `largo` x `largo/1.586` y se escala para coincidir con cada extremo.
 */
export function vuelo(p: number, origen: Rect, destino: { cx: number; cy: number }, largo: number, desplazamientoY = 0) {
  "worklet";
  const cx0 = origen.x + origen.width / 2;
  const cy0 = origen.y + origen.height / 2;
  const escala0 = origen.width / largo;
  const cx = cx0 + (destino.cx - cx0) * p;
  const cy = cy0 + (destino.cy + desplazamientoY - cy0) * p;
  return { cx, cy, escala: escala0 + (1 - escala0) * p, rotacion: 90 * p };
}

/** Texto de progreso: "Faltan 3 puntos para Café gratis" / "¡Café gratis disponible!" */
export function textoFalta(puntos: number, meta: number, premio: string) {
  const falta = Math.max(0, meta - puntos);
  if (!falta) return `¡${premio} disponible!`;
  return `${falta === 1 ? "Falta 1 punto" : `Faltan ${falta} puntos`} para ${premio}`;
}
