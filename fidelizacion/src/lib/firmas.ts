import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Tokens firmados con HMAC-SHA256: base64url(json).base64url(firma).
 * Se usan para el "toque pendiente" (cookie entre el toque y el registro) y,
 * más adelante, para el QR de respaldo.
 */
export function firmar(payload: object, secreto: string): string {
  const cuerpo = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const firma = createHmac("sha256", secreto).update(cuerpo).digest("base64url");
  return `${cuerpo}.${firma}`;
}

export function verificarFirma<T extends { exp: number }>(token: string | undefined, secreto: string): T | null {
  if (!token) return null;
  const [cuerpo, firma] = token.split(".");
  if (!cuerpo || !firma) return null;
  const esperada = createHmac("sha256", secreto).update(cuerpo).digest();
  const recibida = Buffer.from(firma, "base64url");
  if (recibida.length !== esperada.length || !timingSafeEqual(recibida, esperada)) return null;
  try {
    const datos = JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf8")) as T;
    if (typeof datos.exp !== "number" || datos.exp < Date.now() / 1000) return null;
    return datos;
  } catch {
    return null;
  }
}
