import aesjs from "aes-js";

/**
 * Programación de NTAG 424 DNA con SUN (NXP AN12196 / datasheet NT4H2421Gx).
 *
 * Deja el chip así:
 *   - NDEF: URL `{base}/n?p=<PICCData cifrado>&m=<SDMMAC>` (el servidor la valida en src/lib/sun.ts).
 *   - Key 1 = SDMMetaRead (común a todos los chips), Key 2 = SDMFileRead (única por chip),
 *     Key 0 = maestra (única por chip). Las tres vienen del servidor.
 *   - Archivo NDEF: lectura libre, escritura y cambio de permisos sólo con Key 0.
 *
 * Orden pensado para no "brickear" un chip: la Key 0 se cambia al final, recién después de que
 * el servidor verificó una lectura real. Si algo falla antes, el chip sigue con Key 0 de fábrica
 * (o con la nuestra, que el servidor puede volver a dar) y se puede reintentar.
 */

export type Bytes = Uint8Array;
/** Manda un APDU y devuelve la respuesta con los 2 bytes de estado al final. */
export type Transceptor = (apdu: Bytes) => Promise<Bytes>;
export type Aleatorio = (n: number) => Bytes;

export class ErrorChip extends Error {
  readonly sw?: string;
  constructor(mensaje: string, sw?: string) {
    super(mensaje);
    this.sw = sw;
  }
}

// --- utilidades ---------------------------------------------------------------

export const hexABytes = (h: string): Bytes => {
  const limpio = h.replace(/\s/g, "");
  if (limpio.length % 2) throw new Error("hex impar");
  const out = new Uint8Array(limpio.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(limpio.slice(i * 2, i * 2 + 2), 16);
  return out;
};
export const bytesAHex = (b: Bytes): string => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
export const concat = (...partes: (Bytes | number[])[]): Bytes => {
  const total = partes.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  let i = 0;
  for (const p of partes) {
    out.set(p, i);
    i += p.length;
  }
  return out;
};
const xor = (a: Bytes, b: Bytes): Bytes => a.map((x, i) => x ^ b[i]);
const CERO16 = new Uint8Array(16);

function aesEcbCifrar(k: Bytes, bloque: Bytes): Bytes {
  return new aesjs.ModeOfOperation.ecb(k).encrypt(bloque);
}
function aesCbcCifrar(k: Bytes, iv: Bytes, datos: Bytes): Bytes {
  return new aesjs.ModeOfOperation.cbc(k, iv).encrypt(datos);
}
function aesCbcDescifrar(k: Bytes, iv: Bytes, datos: Bytes): Bytes {
  return new aesjs.ModeOfOperation.cbc(k, iv).decrypt(datos);
}

function dobleGF(b: Bytes): Bytes {
  const out = new Uint8Array(16);
  let acarreo = 0;
  for (let i = 15; i >= 0; i--) {
    out[i] = ((b[i] << 1) | acarreo) & 0xff;
    acarreo = (b[i] & 0x80) >> 7;
  }
  if (b[0] & 0x80) out[15] ^= 0x87;
  return out;
}

/** AES-CMAC (RFC 4493). */
export function aesCmac(k: Bytes, msg: Bytes): Bytes {
  const L = aesEcbCifrar(k, CERO16);
  const K1 = dobleGF(L);
  const K2 = dobleGF(K1);
  const n = Math.max(1, Math.ceil(msg.length / 16));
  const completo = msg.length > 0 && msg.length % 16 === 0;
  let ultimo: Bytes;
  if (completo) ultimo = xor(msg.subarray((n - 1) * 16), K1);
  else {
    const relleno = new Uint8Array(16);
    const resto = msg.subarray((n - 1) * 16);
    relleno.set(resto);
    relleno[resto.length] = 0x80;
    ultimo = xor(relleno, K2);
  }
  let x: Bytes = CERO16;
  for (let i = 0; i < n - 1; i++) x = aesEcbCifrar(k, xor(x, msg.subarray(i * 16, i * 16 + 16)));
  return aesEcbCifrar(k, xor(x, ultimo));
}

/** MAC truncado de NTAG 424: los bytes impares del CMAC. */
export const truncarMac = (m: Bytes): Bytes => Uint8Array.from([1, 3, 5, 7, 9, 11, 13, 15], (i) => m[i]);

/** Relleno ISO/IEC 9797-1 método 2 (siempre agrega 0x80). */
export function rellenar(d: Bytes): Bytes {
  const largo = (Math.floor(d.length / 16) + 1) * 16;
  const out = new Uint8Array(largo);
  out.set(d);
  out[d.length] = 0x80;
  return out;
}

const rotarIzq = (b: Bytes): Bytes => concat(b.subarray(1), [b[0]]);

/** CRC32 de DESFire/NTAG ("CRC32NK"): CRC-32 IEEE sin el XOR final, little-endian. */
export function crc32nk(datos: Bytes): Bytes {
  let crc = 0xffffffff;
  for (const b of datos) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  crc >>>= 0;
  return Uint8Array.from([crc & 0xff, (crc >>> 8) & 0xff, (crc >>> 16) & 0xff, (crc >>> 24) & 0xff]);
}

// --- sesión autenticada (AuthenticateEV2First) --------------------------------

type Sesion = { kEnc: Bytes; kMac: Bytes; ti: Bytes; ctr: number };

/** Claves de sesión a partir de RndA y RndB (AN12196 §3.6 / datasheet §9.1.7). */
export function clavesDeSesion(k: Bytes, rndA: Bytes, rndB: Bytes): { kEnc: Bytes; kMac: Bytes } {
  const medio = concat(rndA.subarray(0, 2), xor(rndA.subarray(2, 8), rndB.subarray(0, 6)), rndB.subarray(6, 16), rndA.subarray(8, 16));
  const sv1 = concat([0xa5, 0x5a, 0x00, 0x01, 0x00, 0x80], medio);
  const sv2 = concat([0x5a, 0xa5, 0x00, 0x01, 0x00, 0x80], medio);
  return { kEnc: aesCmac(k, sv1), kMac: aesCmac(k, sv2) };
}

const sw = (r: Bytes) => bytesAHex(r.subarray(r.length - 2));
const cuerpo = (r: Bytes) => r.subarray(0, r.length - 2);

/** APDU "nativo" envuelto en ISO 7816: 90 CMD 00 00 Lc datos 00. */
const nativo = (cmd: number, datos: Bytes | number[] = []) =>
  datos.length ? concat([0x90, cmd, 0x00, 0x00, datos.length], datos, [0x00]) : Uint8Array.from([0x90, cmd, 0x00, 0x00, 0x00]);

async function enviar(tx: Transceptor, apdu: Bytes, esperado: string[], que: string): Promise<Bytes> {
  const r = await tx(apdu);
  if (r.length < 2) throw new ErrorChip(`${que}: respuesta vacía`);
  const estado = sw(r);
  if (!esperado.includes(estado)) throw new ErrorChip(`${que}: el chip respondió ${estado}`, estado);
  return cuerpo(r);
}

async function seleccionarAplicacion(tx: Transceptor) {
  await enviar(tx, hexABytes("00A4040007D276000085010100"), ["9000"], "Seleccionar aplicación");
}

async function autenticar(tx: Transceptor, nroClave: number, k: Bytes, aleatorio: Aleatorio): Promise<Sesion> {
  const r1 = await enviar(tx, nativo(0x71, [nroClave, 0x00]), ["91AF"], "Autenticar (1)");
  if (r1.length !== 16) throw new ErrorChip("Autenticar: respuesta inesperada");
  const rndB = aesCbcDescifrar(k, CERO16, r1);
  const rndA = aleatorio(16);
  const r2 = await enviar(tx, nativo(0xaf, aesCbcCifrar(k, CERO16, concat(rndA, rotarIzq(rndB)))), ["9100"], "Autenticar (2)");
  const claro = aesCbcDescifrar(k, CERO16, r2);
  const ti = claro.subarray(0, 4);
  const rndAPrima = claro.subarray(4, 20);
  if (bytesAHex(rndAPrima) !== bytesAHex(rotarIzq(rndA))) throw new ErrorChip("Autenticar: el chip no confirmó la clave");
  return { ...clavesDeSesion(k, rndA, rndB), ti: Uint8Array.from(ti), ctr: 0 };
}

const ctrLE = (n: number) => [n & 0xff, (n >> 8) & 0xff];

/** IV para cifrar el comando en modo Full. */
function ivComando(s: Sesion): Bytes {
  return aesEcbCifrar(s.kEnc, concat([0xa5, 0x5a], s.ti, ctrLE(s.ctr), new Uint8Array(8)));
}

/** Arma un comando en modo de comunicación Full: datos cifrados + MAC. */
function comandoFull(s: Sesion, cmd: number, cabecera: Bytes | number[], datos: Bytes): Bytes {
  const cifrado = aesCbcCifrar(s.kEnc, ivComando(s), rellenar(datos));
  const mac = truncarMac(aesCmac(s.kMac, concat([cmd], ctrLE(s.ctr), s.ti, cabecera, cifrado)));
  return nativo(cmd, concat(cabecera, cifrado, mac));
}

async function enviarFull(tx: Transceptor, s: Sesion, cmd: number, cabecera: number[], datos: Bytes, que: string) {
  await enviar(tx, comandoFull(s, cmd, cabecera, datos), ["9100"], que);
  s.ctr++;
}

/** ChangeKey. Para la clave con la que se autenticó (Key 0) va sólo la nueva; para las otras, nueva XOR vieja + CRC. */
async function cambiarClave(tx: Transceptor, s: Sesion, nro: number, nueva: Bytes, vieja: Bytes, autenticadaCon: number) {
  const datos =
    nro === autenticadaCon ? concat(nueva, [0x00]) : concat(xor(nueva, vieja), [0x00], crc32nk(nueva));
  await enviarFull(tx, s, 0xc4, [nro], datos, `Cambiar clave ${nro}`);
}

// --- NDEF con SUN -------------------------------------------------------------

const PLANTILLA_P = "0".repeat(32);
const PLANTILLA_M = "0".repeat(16);

/** Contenido del archivo NDEF (NLEN + registro URI) y offsets de PICCData y MAC dentro del archivo. */
export function armarNdef(base: string): { archivo: Bytes; offsetPicc: number; offsetMac: number } {
  const sinEsquema = base.replace(/^https:\/\//, "").replace(/\/$/, "");
  const uri = `${sinEsquema}/n?p=${PLANTILLA_P}&m=${PLANTILLA_M}`;
  const uriBytes = new TextEncoder().encode(uri);
  const payload = concat([0x04], uriBytes); // 0x04 = "https://"
  if (payload.length > 255) throw new Error("URL demasiado larga");
  const registro = concat([0xd1, 0x01, payload.length, 0x55], payload);
  const archivo = concat([(registro.length >> 8) & 0xff, registro.length & 0xff], registro);
  const inicioUri = 2 + 4 + 1;
  const offsetPicc = inicioUri + uri.indexOf("p=") + 2;
  const offsetMac = inicioUri + uri.indexOf("m=") + 2;
  return { archivo, offsetPicc, offsetMac };
}

const off3 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff];

/** Datos de ChangeFileSettings del archivo NDEF (02) con SDM: PICCData cifrado (Key 1) + SDMMAC (Key 2). */
function datosConfigSdm(offsetPicc: number, offsetMac: number): Bytes {
  return Uint8Array.from([
    0x40, // FileOption: SDM habilitado, comunicación plana
    0x00, 0xe0, // AccessRights: Read=E (libre), Write=0, ReadWrite=0, Change=0
    0xc1, // SDMOptions: UID + contador reflejados, codificación ASCII
    0xff, 0x12, // SDMAccessRights: RFU=F|SDMCtrRet=F, SDMMetaRead=1|SDMFileRead=2 (mismo orden que el "F121" de AN12196)
    ...off3(offsetPicc), // PICCDataOffset
    ...off3(offsetMac), // SDMMACInputOffset (= MAC offset: input vacío)
    ...off3(offsetMac), // SDMMACOffset
  ]);
}

async function escribirNdef(tx: Transceptor, archivo: Bytes) {
  await enviar(tx, hexABytes("00A4000C02E104"), ["9000"], "Seleccionar NDEF");
  // UpdateBinary en tramos (el iPhone manda hasta ~250 bytes por APDU).
  for (let i = 0; i < archivo.length; i += 128) {
    const tramo = archivo.subarray(i, i + 128);
    await enviar(tx, concat([0x00, 0xd6, (i >> 8) & 0xff, i & 0xff, tramo.length], tramo), ["9000"], "Escribir NDEF");
  }
}

/** Lee el NDEF (como lo haría un celular) y saca p y m de la URL. */
async function leerSun(tx: Transceptor): Promise<{ p: string; m: string; url: string }> {
  await seleccionarAplicacion(tx);
  await enviar(tx, hexABytes("00A4000C02E104"), ["9000"], "Seleccionar NDEF");
  const nlen = await enviar(tx, hexABytes("00B0000002"), ["9000"], "Leer NDEF");
  const largo = (nlen[0] << 8) | nlen[1];
  const datos = await enviar(tx, concat([0x00, 0xb0, 0x00, 0x02, Math.min(largo, 250)]), ["9000"], "Leer NDEF");
  const payload = datos.subarray(4);
  const url = "https://" + new TextDecoder().decode(payload.subarray(1));
  const p = /[?&]p=([0-9A-Fa-f]{32})/.exec(url)?.[1];
  const m = /[?&]m=([0-9A-Fa-f]{16})/.exec(url)?.[1];
  if (!p || !m) throw new ErrorChip("El chip no devolvió la URL segura");
  if (p === PLANTILLA_P) throw new ErrorChip("El chip no está cifrando (SDM sin activar)");
  return { p: p.toUpperCase(), m: m.toUpperCase(), url };
}

export type ClavesChip = { k0: Bytes; kMeta: Bytes; kFile: Bytes };
export type Paso = "conectando" | "escribiendo" | "claves" | "verificando" | "cerrando" | "listo";

/**
 * Programa un chip de fábrica (Key 0 = ceros) o uno a medio programar por nosotros (Key 0 = k0).
 * `verificar` recibe p y m leídos del chip; tiene que tirar error si el servidor no los acepta.
 */
export async function programarChip(
  tx: Transceptor,
  opciones: {
    base: string;
    claves: ClavesChip;
    aleatorio: Aleatorio;
    verificar: (sun: { p: string; m: string }) => Promise<void>;
    paso?: (p: Paso) => void;
  },
): Promise<void> {
  const { base, claves, aleatorio, verificar, paso = () => {} } = opciones;
  const { archivo, offsetPicc, offsetMac } = armarNdef(base);

  paso("conectando");
  await seleccionarAplicacion(tx);

  // ¿Chip de fábrica o ya tocado por nosotros?
  let k0Actual: Bytes = CERO16;
  let s: Sesion;
  try {
    s = await autenticar(tx, 0, CERO16, aleatorio);
  } catch (e) {
    if (!(e instanceof ErrorChip) || e.sw !== "91AE") throw e;
    await seleccionarAplicacion(tx);
    try {
      s = await autenticar(tx, 0, claves.k0, aleatorio);
    } catch {
      throw new ErrorChip("Este chip tiene otra clave maestra: no es de fábrica ni de Point.");
    }
    k0Actual = claves.k0;
  }

  paso("escribiendo");
  // De fábrica la escritura es libre. Si ya le activamos SUN (escritura sólo con Key 0), la URL ya es la nuestra:
  // seguimos y la verificación del final confirma que esté bien.
  try {
    await escribirNdef(tx, archivo);
  } catch (e) {
    if (!(e instanceof ErrorChip) || !["6982", "6985"].includes(e.sw ?? "")) throw e;
  }
  await seleccionarAplicacion(tx);
  s = await autenticar(tx, 0, k0Actual, aleatorio);

  paso("claves");
  // Keys 1 y 2: probamos desde fábrica (ceros) y, si no, asumimos que ya son las nuestras.
  for (const [nro, nueva] of [
    [1, claves.kMeta],
    [2, claves.kFile],
  ] as const) {
    try {
      await cambiarClave(tx, s, nro, nueva, CERO16, 0);
    } catch (e) {
      if (!(e instanceof ErrorChip)) throw e;
      await seleccionarAplicacion(tx);
      s = await autenticar(tx, 0, k0Actual, aleatorio);
      await cambiarClave(tx, s, nro, nueva, nueva, 0);
    }
  }
  await enviarFull(tx, s, 0x5f, [0x02], datosConfigSdm(offsetPicc, offsetMac), "Activar SUN");

  paso("verificando");
  const sun = await leerSun(tx);
  await verificar(sun);

  paso("cerrando");
  if (k0Actual === CERO16) {
    await seleccionarAplicacion(tx);
    s = await autenticar(tx, 0, CERO16, aleatorio);
    await cambiarClave(tx, s, 0, claves.k0, CERO16, 0);
  }
  paso("listo");
}
