/** Coordenadas de un local (grados decimales, WGS84). */
export type Coordenadas = { latitud: number; longitud: number };

const NUMERO = String.raw`[-+]?\d{1,3}(?:[.,]\d+)?`;
const PAR = new RegExp(String.raw`^\s*\(?\s*(${NUMERO})\s*[,;\s]\s*(${NUMERO})\s*\)?\s*$`);

const numero = (v: string) => Number(v.replace(",", "."));

export function coordenadasValidas(c: Coordenadas) {
  return Number.isFinite(c.latitud) && Number.isFinite(c.longitud) && Math.abs(c.latitud) <= 90 && Math.abs(c.longitud) <= 180;
}

/**
 * Lee "lat, lng" tal como lo copia Google Maps ("-32.946812, -60.639321").
 * También acepta "(lat, lng)", separado por espacio o punto y coma. null si no se entiende.
 */
export function leerCoordenadas(texto: string): Coordenadas | null {
  const m = texto.match(PAR);
  if (!m) return null;
  // Con coma decimal ("-32,94 -60,63") el separador tiene que ser espacio o ";".
  const c = { latitud: numero(m[1]), longitud: numero(m[2]) };
  return coordenadasValidas(c) ? c : null;
}

/** Link a Google Maps para verificar el punto. */
export const urlMapa = (c: Coordenadas) => `https://www.google.com/maps?q=${c.latitud},${c.longitud}`;
