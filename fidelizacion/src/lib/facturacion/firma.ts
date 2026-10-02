import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Validación de la firma de los webhooks de Mercado Pago (header `x-signature`).
 *
 * MP firma cada notificación con la clave secreta de la aplicación:
 *   x-signature: ts=1704908010,v1=<HMAC-SHA256 en hex>
 * El texto firmado ("manifest") es:
 *   id:<data.id de la URL>;request-id:<header x-request-id>;ts:<ts>;
 * Si data.id es alfanumérico se usa en minúsculas; si falta un valor, se saca su
 * parte del manifest. Recalculamos el HMAC con nuestra clave y comparamos.
 *
 * Por qué importa: la URL del webhook es pública. Sin la firma, cualquiera podría
 * mandarnos "el pago 123 fue aprobado". Igual, nunca le creemos al cuerpo del
 * webhook: con la firma sabemos que viene de MP, y después consultamos el recurso
 * a la API para saber su estado real.
 */
export type ResultadoFirma = { valida: true } | { valida: false; motivo: string };

export function leerXSignature(header: string | null): { ts: string; v1: string } | null {
  if (!header) return null;
  const partes = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, ...v] = p.trim().split("=");
      return [k?.trim(), v.join("=").trim()];
    }),
  );
  return partes.ts && partes.v1 ? { ts: partes.ts, v1: partes.v1 } : null;
}

export function manifestFirma(dataId: string | null, requestId: string | null, ts: string): string {
  let m = "";
  if (dataId) m += `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};`;
  if (requestId) m += `request-id:${requestId};`;
  m += `ts:${ts};`;
  return m;
}

export function verificarFirmaMp(p: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secreto: string;
}): ResultadoFirma {
  const firma = leerXSignature(p.xSignature);
  if (!firma) return { valida: false, motivo: "sin header x-signature (o mal formado)" };
  if (!/^[0-9a-f]{64}$/i.test(firma.v1)) return { valida: false, motivo: "v1 no es un HMAC-SHA256" };
  const esperado = createHmac("sha256", p.secreto).update(manifestFirma(p.dataId, p.xRequestId, firma.ts)).digest();
  const recibido = Buffer.from(firma.v1, "hex");
  // Comparación en tiempo constante: no revela cuántos caracteres coinciden.
  if (recibido.length !== esperado.length || !timingSafeEqual(recibido, esperado)) return { valida: false, motivo: "la firma no coincide" };
  return { valida: true };
}
