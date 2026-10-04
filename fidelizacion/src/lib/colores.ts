/**
 * Colores de la tarjeta en las billeteras. Sin dependencias: lo usan el panel
 * (vista previa en vivo), el pase de Apple y los tests.
 */
import { luminancia, mezclar } from "./diseno-billetera";

export const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function rgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
}

export const cssRgb = (hex: string) => `rgb(${rgb(hex).join(", ")})`;

/** Contraste WCAG entre dos colores (1 a 21). */
export function contraste(a: string, b: string) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const BLANCO = "#ffffff";
const CASI_NEGRO = "#111311";

/** Texto que mejor se lee sobre el fondo: blanco o casi negro. */
export function textoPorDefecto(fondo: string) {
  return contraste(fondo, BLANCO) >= contraste(fondo, CASI_NEGRO) ? BLANCO : CASI_NEGRO;
}

/** Etiquetas: el acento si se lee sobre el fondo; si no, el mismo color del texto. */
export function etiquetaPorDefecto(fondo: string, acento: string, texto = textoPorDefecto(fondo)) {
  return contraste(fondo, acento) >= 3 ? acento : texto;
}

type LocalColores = {
  color_primario: string;
  color_secundario: string;
  color_texto?: string | null;
  color_etiqueta?: string | null;
};

/** Colores efectivos de la tarjeta: lo elegido en el panel o, si no, lo calculado. */
export function coloresTarjeta(local: LocalColores) {
  const fondo = local.color_primario;
  const texto = local.color_texto ?? textoPorDefecto(fondo);
  const etiqueta = local.color_etiqueta ?? etiquetaPorDefecto(fondo, local.color_secundario, texto);
  return { fondo, texto, etiqueta };
}

export type NivelContraste = "ok" | "bajo" | "muy-bajo";

/** Texto normal: WCAG AA pide 4.5; debajo de 3 cuesta leerlo. */
export function nivelContraste(a: string, b: string, minimo = 4.5): NivelContraste {
  const c = contraste(a, b);
  return c >= minimo ? "ok" : c >= 3 ? "bajo" : "muy-bajo";
}

/**
 * Lleva `color` hacia `destino` (blanco o negro) lo mínimo necesario para que su
 * contraste con `contra` llegue a `objetivo`. Si ya llega, lo devuelve igual.
 */
export function ajustarHasta(color: string, contra: string, objetivo: number, destino: string): string {
  if (contraste(color, contra) >= objetivo) return color;
  for (let t = 0.05; t < 1; t += 0.05) {
    const c = mezclar(color, destino, t);
    if (contraste(c, contra) >= objetivo) return c;
  }
  return destino;
}

/** Aclara u oscurece (lo que corresponda) hasta el contraste pedido contra `contra`. */
export function separarDe(color: string, contra: string, objetivo: number): string {
  const destino = luminancia(contra) > 0.18 ? "#000000" : "#ffffff";
  return ajustarHasta(color, contra, objetivo, destino);
}

/** Saturación HSL (0 = gris, 1 = color puro). */
export function saturacion(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return 0;
  return (max - min) / (1 - Math.abs(2 * l - 1));
}
