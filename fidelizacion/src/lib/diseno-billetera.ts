/**
 * Piezas gráficas de la billetera (Pass2U hoy, Apple/Google Wallet más adelante),
 * generadas con los colores de cada local a partir del diseño de Point.
 * Todo devuelve SVG en texto (sin fuentes: los textos se agregan aparte).
 */

type Colores = { primario: string; acento: string };

const HEX = /^#[0-9a-f]{6}$/i;
const GRIS_VACIO = "#D1CECC";

function rgb(hex: string): [number, number, number] {
  const n = parseInt((HEX.test(hex) ? hex : "#000000").slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mezcla dos colores: t = 0 → a, t = 1 → b. */
export function mezclar(a: string, b: string, t: number): string {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}

/** Luminancia relativa (0 = negro, 1 = blanco). */
export function luminancia(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Sello de Point (aro + punto + ondas NFC) centrado en (cx, cy) con radio r.
 * Lleno: aro del color principal, punto y ondas del acento. Vacío: gris.
 */
export function svgSello(cx: number, cy: number, r: number, lleno: boolean, { primario, acento }: Colores): string {
  const aro = lleno ? primario : GRIS_VACIO;
  const punto = lleno ? acento : GRIS_VACIO;
  const k = r / 33; // proporciones del diseño original (r = 33)
  const p = (dx: number, dy: number) => `${(cx + dx * k).toFixed(1)} ${(cy + dy * k).toFixed(1)}`;
  return (
    `<circle cx="${cx}" cy="${cy}" r="${r}" stroke="${aro}" stroke-width="${(10 * k).toFixed(1)}" fill="none"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${(13 * k).toFixed(1)}" fill="${punto}"/>` +
    `<path d="M ${p(18, -26)} A ${(23 * k).toFixed(1)} ${(23 * k).toFixed(1)} 0 0 1 ${p(31, -4)}" stroke="${punto}" stroke-width="${(6 * k).toFixed(1)}" stroke-linecap="round" fill="none"/>` +
    `<path d="M ${p(30, -36)} A ${(33 * k).toFixed(1)} ${(33 * k).toFixed(1)} 0 0 1 ${p(45, 2)}" stroke="${punto}" stroke-width="${(6 * k).toFixed(1)}" stroke-linecap="round" fill="none"/>`
  );
}

/** Isotipo de Point en línea (para la columna de la marca). */
function svgIsotipo(cx: number, cy: number, color: string): string {
  return (
    `<circle cx="${cx}" cy="${cy}" r="46" stroke="${color}" stroke-width="12" fill="none"/>` +
    `<circle cx="${cx}" cy="${cy}" r="18" fill="${color}"/>` +
    `<path d="M ${cx + 26} ${cy - 36} A 32 32 0 0 1 ${cx + 44} ${cy - 6}" stroke="${color}" stroke-width="8" stroke-linecap="round" fill="none"/>` +
    `<path d="M ${cx + 42} ${cy - 50} A 47 47 0 0 1 ${cx + 63} ${cy + 2}" stroke="${color}" stroke-width="8" stroke-linecap="round" fill="none"/>`
  );
}

function svgRegalo(x: number, y: number, color: string, fondo: string): string {
  return (
    `<rect x="${x - 28}" y="${y}" width="56" height="43" rx="4" fill="${color}"/>` +
    `<rect x="${x - 6}" y="${y}" width="12" height="43" fill="${fondo}" opacity="0.95"/>` +
    `<rect x="${x - 28}" y="${y + 16}" width="56" height="8" fill="${fondo}" opacity="0.95"/>` +
    `<path d="M ${x} ${y} C ${x - 2} ${y - 20}, ${x - 18} ${y - 26}, ${x - 24} ${y - 16} C ${x - 29} ${y - 7}, ${x - 16} ${y - 3}, ${x} ${y} Z" fill="${color}"/>` +
    `<path d="M ${x} ${y} C ${x + 2} ${y - 20}, ${x + 18} ${y - 26}, ${x + 24} ${y - 16} C ${x + 29} ${y - 7}, ${x + 16} ${y - 3}, ${x} ${y} Z" fill="${color}"/>` +
    `<line x1="${x}" y1="${y - 44}" x2="${x}" y2="${y - 28}" stroke="${color}" stroke-width="4" stroke-linecap="round"/>` +
    `<line x1="${x - 28}" y1="${y - 32}" x2="${x - 19}" y2="${y - 22}" stroke="${color}" stroke-width="4" stroke-linecap="round"/>` +
    `<line x1="${x + 28}" y1="${y - 32}" x2="${x + 19}" y2="${y - 22}" stroke="${color}" stroke-width="4" stroke-linecap="round"/>`
  );
}

/** Posiciones de los sellos: hasta 5 por fila, filas centradas en el área útil. */
export function posicionesSellos(meta: number): { x: number; y: number; r: number }[] {
  const porFila = meta <= 5 ? meta : meta <= 10 ? 5 : Math.ceil(meta / 3);
  const filas = Math.ceil(meta / porFila);
  const r = filas >= 3 ? 26 : 33;
  const pasoX = filas >= 3 ? 96 : 120;
  const pasoY = filas >= 3 ? 108 : 145;
  const centroX = 640;
  const centroY = 216;
  const out: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < meta; i++) {
    const fila = Math.floor(i / porFila);
    const enFila = Math.min(porFila, meta - fila * porFila);
    const col = i % porFila;
    out.push({
      x: Math.round(centroX + (col - (enFila - 1) / 2) * pasoX),
      y: Math.round(centroY + (fila - (filas - 1) / 2) * pasoY),
      r,
    });
  }
  return out;
}

export const MAX_SELLOS_FRANJA = 15;

/**
 * Franja de la billetera (1125×432, tamaño @3x de Apple Wallet) con los sellos.
 * El nombre del local se dibuja aparte (x = 32, y ≈ 160) para no depender de fuentes.
 */
export function svgFranja({ primario, acento, puntos, meta }: Colores & { puntos: number; meta: number }): string {
  const fondo = mezclar(primario, "#F6F4F1", 0.94);
  const acentoSuave = mezclar(acento, primario, 0.25);
  const lineaSuave = mezclar(acento, "#ffffff", 0.35);
  const m = Math.max(1, Math.min(MAX_SELLOS_FRANJA, meta));
  const llenos = Math.min(puntos, m);
  const sellos = posicionesSellos(m)
    .map((s, i) => svgSello(s.x, s.y, s.r, i < llenos, { primario, acento }))
    .join("");
  const listo = puntos >= m;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="1125" height="432" viewBox="0 0 1125 432" fill="none">` +
    `<rect width="1125" height="432" fill="${fondo}"/>` +
    `<path d="M0,0 H265 C235,28 230,62 230,100 C230,138 250,180 268,216 C285,251 288,299 270,336 C255,366 227,392 210,432 H0 Z" fill="${primario}"/>` +
    `<path d="M0,285 C85,285 150,305 210,350 C235,368 255,392 275,432 H0 Z" fill="${acentoSuave}" opacity="0.95"/>` +
    `<path d="M0,330 C60,348 86,372 98,404 C105,421 118,430 138,432" stroke="${lineaSuave}" stroke-width="3" fill="none" opacity="0.7"/>` +
    `<path d="M960,0 H1125 V120 C1100,88 1070,62 1035,54 C1002,46 976,33 960,0 Z" fill="${acentoSuave}"/>` +
    `<path d="M1125,282 V432 H925 C950,406 984,392 1027,384 C1067,377 1105,348 1125,282 Z" fill="${acentoSuave}"/>` +
    svgIsotipo(100, 104, acento) +
    sellos +
    `<line x1="956" y1="100" x2="956" y2="342" stroke="${GRIS_VACIO}" stroke-width="2"/>` +
    svgRegalo(1034, 214, listo ? acento : mezclar(acento, fondo, 0.35), fondo) +
    `</svg>`
  );
}

/** Cabecera para Google Wallet (1032×336). El nombre y el lema se dibujan aparte (x = 290). */
export function svgCabecera({ primario, acento }: Colores): string {
  const claro = mezclar(primario, "#ffffff", 0.12);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="1032" height="336" viewBox="0 0 1032 336" fill="none">` +
    `<defs><linearGradient id="fondo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${primario}"/><stop offset="1" stop-color="${claro}"/></linearGradient></defs>` +
    `<rect width="1032" height="336" fill="url(#fondo)"/>` +
    `<circle cx="160" cy="168" r="64" stroke="${acento}" stroke-width="16" fill="none"/>` +
    `<circle cx="160" cy="168" r="24" fill="${acento}"/>` +
    `<path d="M 195 118 A 45 45 0 0 1 220 160" stroke="${acento}" stroke-width="11" stroke-linecap="round" fill="none"/>` +
    `<path d="M 218 100 A 64 64 0 0 1 248 171" stroke="${acento}" stroke-width="11" stroke-linecap="round" fill="none"/>` +
    `<path d="M0 280 C180 240 260 270 380 336 H0 Z" fill="${acento}" opacity="0.65"/>` +
    `<path d="M1032 78 C940 40 920 14 900 0 H1032 Z" fill="${acento}" opacity="0.35"/>` +
    `</svg>`
  );
}

/** Color del texto sobre el color principal. */
export function textoSobre(hex: string): string {
  return luminancia(hex) > 0.45 ? "#1c1917" : "#F6F4EF";
}
