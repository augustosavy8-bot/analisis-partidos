import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Verificación SUN (Secure Unique NFC) de NTAG 424 DNA, según NXP AN12196.
 *
 * El chip agrega a la URL, en cada lectura:
 *   p = PICCData cifrado (16 bytes, hex)  → AES-128-CBC(K_SDMMetaRead, IV=0)
 *       en claro: PICCDataTag(1) | UID(7) | SDMReadCtr(3, LSB primero) | relleno(5)
 *   m = SDMMAC (8 bytes, hex)             → CMAC truncado con la clave de sesión
 *       K_ses = CMAC(K_SDMFileRead, 3CC3 0001 0080 | UID | SDMReadCtr)
 *       MAC   = CMAC(K_ses, datos entre SDMMACInputOffset y SDMMACOffset) → bytes impares
 * Con la URL configurada así (sin datos extra antes del MAC) el input del MAC es vacío.
 */

const CERO16 = Buffer.alloc(16);

function aesEcb(key: Buffer, bloque: Buffer): Buffer {
  const c = createCipheriv("aes-128-ecb", key, null);
  c.setAutoPadding(false);
  return Buffer.concat([c.update(bloque), c.final()]);
}

function dobleGF(b: Buffer): Buffer {
  const out = Buffer.alloc(16);
  let acarreo = 0;
  for (let i = 15; i >= 0; i--) {
    const v = (b[i] << 1) | acarreo;
    out[i] = v & 0xff;
    acarreo = (b[i] & 0x80) >> 7;
  }
  if (b[0] & 0x80) out[15] ^= 0x87;
  return out;
}

function xor(a: Buffer, b: Buffer): Buffer {
  const out = Buffer.alloc(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i];
  return out;
}

/** AES-CMAC (RFC 4493). */
export function aesCmac(key: Buffer, msg: Buffer): Buffer {
  const L = aesEcb(key, CERO16);
  const K1 = dobleGF(L);
  const K2 = dobleGF(K1);
  const n = Math.max(1, Math.ceil(msg.length / 16));
  const completo = msg.length > 0 && msg.length % 16 === 0;

  let ultimo: Buffer;
  if (completo) {
    ultimo = xor(msg.subarray((n - 1) * 16), K1);
  } else {
    const resto = msg.subarray((n - 1) * 16);
    const relleno = Buffer.alloc(16);
    resto.copy(relleno);
    relleno[resto.length] = 0x80;
    ultimo = xor(relleno, K2);
  }

  let x: Buffer = CERO16;
  for (let i = 0; i < n - 1; i++) x = aesEcb(key, xor(x, msg.subarray(i * 16, i * 16 + 16)));
  return aesEcb(key, xor(x, ultimo));
}

export type PICC = { uid: string; contador: number };

/** Descifra el PICCData. Devuelve null si el formato no es el esperado (clave incorrecta o datos basura). */
export function descifrarPICC(piccHex: string, metaKey: Buffer): PICC | null {
  if (!/^[0-9a-f]{32}$/i.test(piccHex)) return null;
  const d = createDecipheriv("aes-128-cbc", metaKey, CERO16);
  d.setAutoPadding(false);
  const claro = Buffer.concat([d.update(Buffer.from(piccHex, "hex")), d.final()]);

  const tag = claro[0];
  const uidEspejado = (tag & 0x80) !== 0;
  const ctrEspejado = (tag & 0x40) !== 0;
  const largoUid = tag & 0x0f;
  // Exigimos UID (7 bytes) y contador reflejados: es la configuración que usamos.
  if (!uidEspejado || !ctrEspejado || largoUid !== 7) return null;

  const uid = claro.subarray(1, 8).toString("hex").toUpperCase();
  const contador = claro[8] | (claro[9] << 8) | (claro[10] << 16);
  return { uid, contador };
}

function contadorLE(contador: number): Buffer {
  return Buffer.from([contador & 0xff, (contador >> 8) & 0xff, (contador >> 16) & 0xff]);
}

/** SDMMAC esperado (8 bytes) para un UID y contador. */
export function calcularMacSun(fileKey: Buffer, uidHex: string, contador: number): Buffer {
  const sv2 = Buffer.concat([Buffer.from("3CC300010080", "hex"), Buffer.from(uidHex, "hex"), contadorLE(contador)]);
  const kSes = aesCmac(fileKey, sv2);
  const mac = aesCmac(kSes, Buffer.alloc(0));
  return Buffer.from([1, 3, 5, 7, 9, 11, 13, 15].map((i) => mac[i]));
}

export function verificarMacSun(fileKey: Buffer, picc: PICC, macHex: string): boolean {
  if (!/^[0-9a-f]{16}$/i.test(macHex)) return false;
  const esperado = calcularMacSun(fileKey, picc.uid, picc.contador);
  return timingSafeEqual(esperado, Buffer.from(macHex, "hex"));
}

/** Genera un par (p, m) como lo haría el chip. Para tests y para el simulador del superadmin. */
export function generarSun(uidHex: string, contador: number, metaKey: Buffer, fileKey: Buffer) {
  const claro = Buffer.concat([Buffer.from([0xc7]), Buffer.from(uidHex, "hex"), contadorLE(contador), randomBytes(5)]);
  const c = createCipheriv("aes-128-cbc", metaKey, CERO16);
  c.setAutoPadding(false);
  const p = Buffer.concat([c.update(claro), c.final()]).toString("hex").toUpperCase();
  const m = calcularMacSun(fileKey, uidHex, contador).toString("hex").toUpperCase();
  return { p, m };
}
