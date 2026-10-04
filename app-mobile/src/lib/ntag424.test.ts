import { test } from "node:test";
import assert from "node:assert/strict";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import {
  aesCmac,
  armarNdef,
  bytesAHex,
  clavesDeSesion,
  concat,
  crc32nk,
  ErrorChip,
  hexABytes,
  programarChip,
  rellenar,
  truncarMac,
  type Bytes,
} from "./ntag424.ts";

const h = hexABytes;

test("AES-CMAC (RFC 4493)", () => {
  const K = h("2b7e151628aed2a6abf7158809cf4f3c");
  assert.equal(bytesAHex(aesCmac(K, new Uint8Array(0))), "BB1D6929E95937287FA37D129B756746");
  assert.equal(bytesAHex(aesCmac(K, h("6bc1bee22e409f96e93d7e117393172a"))), "070A16B46B4D4144F79BDD9DD04A287C");
});

test("CRC32NK = CRC-32 sin XOR final", () => {
  // CRC-32("123456789") = CBF43926 → sin XOR final = 340BC6D9, en little-endian.
  assert.equal(bytesAHex(crc32nk(new TextEncoder().encode("123456789"))), "D9C60B34");
});

test("claves de sesión: vector de AN12196 (AuthenticateEV2First con clave en cero)", () => {
  const { kEnc, kMac } = clavesDeSesion(new Uint8Array(16), h("13C5DB8A5930439FC3DEF9A4C675360F"), h("B9E2FC789B64BF237CCCAA20EC7E6E48"));
  assert.equal(bytesAHex(kEnc), "1309C877509E5A215007FF0ED19CA564");
  assert.equal(bytesAHex(kMac), "4C6626F5E72EA694202139295C7A7FC7");
});

test("NDEF: offsets de p y m", () => {
  const { archivo, offsetPicc, offsetMac } = armarNdef("https://fidelizacion-beta.vercel.app");
  const texto = new TextDecoder().decode(archivo);
  assert.equal(texto.slice(offsetPicc - 2, offsetPicc), "p=");
  assert.equal(texto.slice(offsetMac - 2, offsetMac), "m=");
  assert.equal((archivo[0] << 8) | archivo[1], archivo.length - 2);
});

// --- Chip simulado (lado tarjeta del protocolo, escrito desde el datasheet) ----

const ecb = (k: Bytes, d: Bytes) => {
  const c = createCipheriv("aes-128-ecb", k, null);
  c.setAutoPadding(false);
  return new Uint8Array(Buffer.concat([c.update(d), c.final()]));
};
const cbc = (k: Bytes, iv: Bytes, d: Bytes, cifrar: boolean) => {
  const c = (cifrar ? createCipheriv : createDecipheriv)("aes-128-cbc", k, iv);
  c.setAutoPadding(false);
  return new Uint8Array(Buffer.concat([c.update(d), c.final()]));
};
const rot = (b: Bytes) => concat(b.subarray(1), [b[0]]);
const ok = (d: Bytes | number[] = []) => concat(d, [0x91, 0x00]);
const iso = (d: Bytes | number[] = []) => concat(d, [0x90, 0x00]);
const err = (s: string) => h(s);

class ChipSimulado {
  claves: Bytes[] = [0, 1, 2, 3, 4].map(() => new Uint8Array(16));
  archivo = new Uint8Array(256);
  write = 0xe; // fábrica: escritura libre
  sdm: { picc: number; mac: number } | null = null;
  ctr = 0;
  uid = h("04DE5F1EACC040");
  private auth: { nro: number; rndB: Bytes; k: Bytes } | null = null;
  private sesion: { kEnc: Bytes; kMac: Bytes; ti: Bytes; ctr: number } | null = null;
  private efSeleccionado = false;

  private desenvolver(cmd: number, cab: number, datos: Bytes): Bytes | null {
    const s = this.sesion!;
    const cabecera = datos.subarray(0, cab);
    const cifrado = datos.subarray(cab, datos.length - 8);
    const mac = datos.subarray(datos.length - 8);
    const ctr = [s.ctr & 0xff, s.ctr >> 8];
    const esperado = truncarMac(aesCmac(s.kMac, concat([cmd], ctr, s.ti, cabecera, cifrado)));
    if (bytesAHex(esperado) !== bytesAHex(mac)) return null;
    const iv = ecb(s.kEnc, concat([0xa5, 0x5a], s.ti, ctr, new Uint8Array(8)));
    const claro = cbc(s.kEnc, iv, cifrado, false);
    s.ctr++;
    return claro;
  }

  async tx(apdu: Bytes): Promise<Bytes> {
    const a = bytesAHex(apdu);
    if (a === "00A4040007D276000085010100") {
      this.sesion = null;
      this.efSeleccionado = false;
      return iso();
    }
    if (a === "00A4000C02E104") {
      this.efSeleccionado = true;
      return iso();
    }
    if (apdu[0] === 0x00 && apdu[1] === 0xd6) {
      if (!this.efSeleccionado) return err("6986");
      if (this.write !== 0xe) return err("6982");
      const off = (apdu[2] << 8) | apdu[3];
      this.archivo.set(apdu.subarray(5, 5 + apdu[4]), off);
      return iso();
    }
    if (apdu[0] === 0x00 && apdu[1] === 0xb0) {
      const off = (apdu[2] << 8) | apdu[3];
      let contenido = this.archivo.slice();
      if (this.sdm) {
        this.ctr++;
        const ctr = [this.ctr & 0xff, (this.ctr >> 8) & 0xff, (this.ctr >> 16) & 0xff];
        const picc = cbc(this.claves[1], new Uint8Array(16), concat([0xc7], this.uid, ctr, randomBytes(5)), true);
        const sv2 = concat(h("3CC300010080"), this.uid, ctr);
        const mac = truncarMac(aesCmac(aesCmac(this.claves[2], sv2), new Uint8Array(0)));
        contenido.set(new TextEncoder().encode(bytesAHex(picc)), this.sdm.picc);
        contenido.set(new TextEncoder().encode(bytesAHex(mac)), this.sdm.mac);
      }
      return iso(contenido.subarray(off, off + apdu[4]));
    }
    // Nativos envueltos: 90 CMD 00 00 Lc datos 00
    if (apdu[0] !== 0x90) return err("6E00");
    const cmd = apdu[1];
    const datos = apdu.length > 5 ? apdu.subarray(5, 5 + apdu[4]) : new Uint8Array(0);
    if (cmd === 0x71) {
      const nro = datos[0];
      const rndB = new Uint8Array(randomBytes(16));
      this.auth = { nro, rndB, k: this.claves[nro] };
      return concat(cbc(this.claves[nro], new Uint8Array(16), rndB, true), [0x91, 0xaf]);
    }
    if (cmd === 0xaf && this.auth) {
      const { k, rndB } = this.auth;
      const claro = cbc(k, new Uint8Array(16), datos, false);
      const rndA = claro.subarray(0, 16);
      if (bytesAHex(claro.subarray(16)) !== bytesAHex(rot(rndB))) {
        this.auth = null;
        return err("91AE");
      }
      const ti = new Uint8Array(randomBytes(4));
      this.sesion = { ...clavesDeSesion(k, rndA, rndB), ti, ctr: 0 };
      const resp = cbc(k, new Uint8Array(16), concat(ti, rot(rndA), new Uint8Array(12)), true);
      this.auth = null;
      return ok(resp);
    }
    if (cmd === 0xc4 && this.sesion) {
      const nro = datos[0];
      const claro = this.desenvolver(cmd, 1, datos);
      if (!claro) return err("911E");
      if (nro === 0) {
        this.claves[0] = claro.slice(0, 16);
        this.sesion = null;
        return ok();
      }
      const nueva = claro.slice(0, 16).map((x, i) => x ^ this.claves[nro][i]);
      if (bytesAHex(crc32nk(nueva)) !== bytesAHex(claro.subarray(17, 21))) {
        this.sesion = null;
        return err("911E");
      }
      this.claves[nro] = nueva;
      return ok(new Uint8Array(8));
    }
    if (cmd === 0x5f && this.sesion) {
      const claro = this.desenvolver(cmd, 1, datos);
      if (!claro) return err("911E");
      assert.equal(claro[0], 0x40);
      assert.equal(bytesAHex(claro.subarray(1, 3)), "00E0");
      assert.equal(claro[3], 0xc1);
      assert.equal(bytesAHex(claro.subarray(4, 6)), "FF12");
      const off = (i: number) => claro[i] | (claro[i + 1] << 8) | (claro[i + 2] << 16);
      assert.equal(off(9), off(12), "MAC input = MAC offset");
      this.sdm = { picc: off(6), mac: off(12) };
      this.write = (claro[2] & 0x0f) as number;
      return ok(new Uint8Array(8));
    }
    return err("911C");
  }
}

const claves = { k0: h("0102030405060708090A0B0C0D0E0F10"), kMeta: h("A1A2A3A4A5A6A7A8A9AAABACADAEAFB0"), kFile: h("C1C2C3C4C5C6C7C8C9CACBCCCDCECFD0") };
const aleatorio = (n: number) => new Uint8Array(randomBytes(n));

/** Verificación como la del servidor (src/lib/sun.ts en fidelizacion). */
function verificarComoServidor(p: string, m: string, kMeta: Bytes, kFile: Bytes) {
  const claro = cbc(kMeta, new Uint8Array(16), h(p), false);
  assert.equal(claro[0], 0xc7);
  const uid = claro.subarray(1, 8);
  const ctr = claro.subarray(8, 11);
  const mac = truncarMac(aesCmac(aesCmac(kFile, concat(h("3CC300010080"), uid, ctr)), new Uint8Array(0)));
  assert.equal(bytesAHex(mac), m);
  return bytesAHex(uid);
}

test("programa un chip de fábrica y queda con SUN y claves nuevas", async () => {
  const chip = new ChipSimulado();
  const pasos: string[] = [];
  let verificado = "";
  await programarChip((a) => chip.tx(a), {
    base: "https://fidelizacion-beta.vercel.app",
    claves,
    aleatorio,
    paso: (p) => pasos.push(p),
    verificar: async ({ p, m }) => {
      verificado = verificarComoServidor(p, m, claves.kMeta, claves.kFile);
    },
  });
  assert.equal(verificado, "04DE5F1EACC040");
  assert.deepEqual(chip.claves.slice(0, 3).map(bytesAHex), [claves.k0, claves.kMeta, claves.kFile].map(bytesAHex));
  assert.equal(chip.write, 0);
  assert.deepEqual(pasos, ["conectando", "escribiendo", "claves", "verificando", "cerrando", "listo"]);
});

test("si el servidor rechaza, la Key 0 queda de fábrica y se puede reintentar", async () => {
  const chip = new ChipSimulado();
  await assert.rejects(
    programarChip((a) => chip.tx(a), { base: "https://x.app", claves, aleatorio, verificar: async () => Promise.reject(new Error("no")) }),
  );
  assert.equal(bytesAHex(chip.claves[0]), "0".repeat(32));
  await programarChip((a) => chip.tx(a), {
    base: "https://x.app",
    claves,
    aleatorio,
    verificar: async ({ p, m }) => void verificarComoServidor(p, m, claves.kMeta, claves.kFile),
  });
  assert.equal(bytesAHex(chip.claves[0]), bytesAHex(claves.k0));
});

test("reprogramar un chip que ya es de Point funciona", async () => {
  const chip = new ChipSimulado();
  const op = { base: "https://x.app", claves, aleatorio, verificar: async ({ p, m }: { p: string; m: string }) => void verificarComoServidor(p, m, claves.kMeta, claves.kFile) };
  await programarChip((a) => chip.tx(a), op);
  await programarChip((a) => chip.tx(a), op);
  assert.equal(bytesAHex(chip.claves[2]), bytesAHex(claves.kFile));
});

test("un chip con otra clave maestra no se toca", async () => {
  const chip = new ChipSimulado();
  chip.claves[0] = h("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
  await assert.rejects(
    programarChip((a) => chip.tx(a), { base: "https://x.app", claves, aleatorio, verificar: async () => {} }),
    (e: unknown) => e instanceof ErrorChip && /otra clave maestra/.test(e.message),
  );
});

test("relleno ISO 9797-1 M2", () => {
  assert.equal(rellenar(new Uint8Array(15)).length, 16);
  assert.equal(rellenar(new Uint8Array(16)).length, 32);
});
