import { describe, expect, it } from "vitest";
import { cifrarClaveChip, descifrarClaveChip, esClaveChipValida } from "./cifrado";

const M = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";
const K = "000102030405060708090a0b0c0d0e0f";

describe("cifrado de claves de chips", () => {
  it("cifra y descifra (ida y vuelta)", () => {
    const c = cifrarClaveChip(K, M);
    expect(c.startsWith("v1:")).toBe(true);
    expect(c).not.toContain(K);
    expect(descifrarClaveChip(c, M).toString("hex")).toBe(K);
  });
  it("cada cifrado es distinto (IV aleatorio)", () => {
    expect(cifrarClaveChip(K, M)).not.toBe(cifrarClaveChip(K, M));
  });
  it("falla con otra clave maestra o datos adulterados", () => {
    const c = cifrarClaveChip(K, M);
    expect(() => descifrarClaveChip(c, "ff".repeat(32))).toThrow();
    const raw = Buffer.from(c.slice(3), "base64");
    raw[raw.length - 1] ^= 1;
    expect(() => descifrarClaveChip("v1:" + raw.toString("base64"), M)).toThrow();
  });
  it("valida el formato de la clave del chip", () => {
    expect(esClaveChipValida(K)).toBe(true);
    expect(esClaveChipValida("abc")).toBe(false);
    expect(() => cifrarClaveChip("xyz", M)).toThrow();
  });
});
