import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Tokens firmados con HMAC-SHA256: base64url(json).base64url(firma).
 *
 * Cada tipo de token se firma con su propia clave (derivada del secreto), así
 * un token de un tipo nunca sirve como otro: por ejemplo, el "toque pendiente"
 * que recibe el cliente no puede usarse como sesión de mozo.
 */
export type TipoToken = "mozo" | "toque" | "qr";

function clave(tipo: TipoToken, secreto: string): Buffer {
  return createHmac("sha256", secreto).update(`fid-token:${tipo}`).digest();
}

export function firmar(tipo: TipoToken, payload: object, secreto: string): string {
  const cuerpo = Buffer.from(JSON.stringify({ ...payload, typ: tipo })).toString("base64url");
  const firma = createHmac("sha256", clave(tipo, secreto)).update(cuerpo).digest("base64url");
  return `${cuerpo}.${firma}`;
}

export function verificarFirma<T extends { exp: number }>(
  tipo: TipoToken,
  token: string | undefined,
  secreto: string,
): T | null {
  if (!token) return null;
  const [cuerpo, firma] = token.split(".");
  if (!cuerpo || !firma) return null;
  const esperada = createHmac("sha256", clave(tipo, secreto)).update(cuerpo).digest();
  const recibida = Buffer.from(firma, "base64url");
  if (recibida.length !== esperada.length || !timingSafeEqual(recibida, esperada)) return null;
  try {
    const datos = JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf8")) as T & { typ?: string };
    if (datos.typ !== tipo) return null;
    if (typeof datos.exp !== "number" || datos.exp < Date.now() / 1000) return null;
    return datos;
  } catch {
    return null;
  }
}
