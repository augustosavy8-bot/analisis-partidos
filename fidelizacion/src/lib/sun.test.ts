import { describe, expect, it } from "vitest";
import { aesCmac, calcularMacSun, descifrarPICC, generarSun, verificarMacSun } from "./sun";

const hex = (s: string) => Buffer.from(s, "hex");

describe("AES-CMAC (vectores RFC 4493)", () => {
  const K = hex("2b7e151628aed2a6abf7158809cf4f3c");
  it("mensaje vacío", () => {
    expect(aesCmac(K, Buffer.alloc(0)).toString("hex")).toBe("bb1d6929e95937287fa37d129b756746");
  });
  it("16 bytes", () => {
    expect(aesCmac(K, hex("6bc1bee22e409f96e93d7e117393172a")).toString("hex")).toBe("070a16b46b4d4144f79bdd9dd04a287c");
  });
  it("40 bytes", () => {
    const m = hex("6bc1bee22e409f96e93d7e117393172aae2d8a571e03ac9c9eb76fac45af8e5130c81c46a35ce411");
    expect(aesCmac(K, m).toString("hex")).toBe("dfa66747de9ae63030ca32611497c827");
  });
  it("64 bytes", () => {
    const m = hex(
      "6bc1bee22e409f96e93d7e117393172aae2d8a571e03ac9c9eb76fac45af8e5130c81c46a35ce411e5fbc1191a0a52eff69f2445df4f9b17ad2b417be66c3710",
    );
    expect(aesCmac(K, m).toString("hex")).toBe("51f0bebf7e3b9d92fc49741779363cfe");
  });
});

describe("SUN NTAG 424 DNA (vectores NXP AN12196)", () => {
  const CERO = Buffer.alloc(16);
  const picc = "EF963FF7828658A599F3041510671E88";
  const cmac = "94EED9EE65337086";

  it("descifra el PICCData: UID y contador", () => {
    expect(descifrarPICC(picc, CERO)).toEqual({ uid: "04DE5F1EACC040", contador: 61 });
  });

  it("calcula el SDMMAC del ejemplo", () => {
    expect(calcularMacSun(CERO, "04DE5F1EACC040", 61).toString("hex").toUpperCase()).toBe(cmac);
  });

  it("verifica el mensaje completo y rechaza alteraciones", () => {
    const d = descifrarPICC(picc, CERO)!;
    expect(verificarMacSun(CERO, d, cmac)).toBe(true);
    expect(verificarMacSun(CERO, d, "94EED9EE65337087")).toBe(false);
    expect(verificarMacSun(CERO, { ...d, contador: 62 }, cmac)).toBe(false);
    expect(verificarMacSun(hex("00112233445566778899aabbccddeeff"), d, cmac)).toBe(false);
  });

  it("con otra clave de metadatos el PICCData no se reconoce", () => {
    expect(descifrarPICC(picc, hex("00112233445566778899aabbccddeeff"))).toBeNull();
    expect(descifrarPICC("zz", CERO)).toBeNull();
  });

  it("generarSun produce mensajes verificables (ida y vuelta)", () => {
    const meta = hex("0f0e0d0c0b0a09080706050403020100");
    const file = hex("a0a1a2a3a4a5a6a7a8a9aaabacadaeaf");
    const { p, m } = generarSun("04AABBCCDDEE01", 1234, meta, file);
    const d = descifrarPICC(p, meta)!;
    expect(d).toEqual({ uid: "04AABBCCDDEE01", contador: 1234 });
    expect(verificarMacSun(file, d, m)).toBe(true);
  });
});
