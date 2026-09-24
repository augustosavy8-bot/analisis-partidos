import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Cifrado de las claves AES-128 de los chips con AES-256-GCM.
 * Formato: "v1:" + base64(iv[12] | tag[16] | ciphertext).
 * La clave maestra (32 bytes, hex) vive sólo en el servidor: CHIPS_MASTER_KEY.
 */
function claveMaestra(hex: string): Buffer {
  if (!/^[0-9a-f]{64}$/i.test(hex)) throw new Error("CHIPS_MASTER_KEY debe ser 64 caracteres hex (32 bytes)");
  return Buffer.from(hex, "hex");
}

export function esClaveChipValida(hex: string): boolean {
  return /^[0-9a-f]{32}$/i.test(hex);
}

export function cifrarClaveChip(claveHex: string, maestraHex: string): string {
  if (!esClaveChipValida(claveHex)) throw new Error("La clave del chip debe ser AES-128 (32 caracteres hex)");
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", claveMaestra(maestraHex), iv);
  const ct = Buffer.concat([c.update(Buffer.from(claveHex, "hex")), c.final()]);
  return "v1:" + Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64");
}

export function descifrarClaveChip(cifrada: string, maestraHex: string): Buffer {
  if (!cifrada.startsWith("v1:")) throw new Error("Formato de clave cifrada desconocido");
  const raw = Buffer.from(cifrada.slice(3), "base64");
  const d = createDecipheriv("aes-256-gcm", claveMaestra(maestraHex), raw.subarray(0, 12));
  d.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]);
}
