import { describe, expect, it } from "vitest";
import { casiPremio } from "./casi";

describe("casiPremio", () => {
  const premio = { nombre: "Trago de la casa", puntos: 8 };
  it("sólo cuando falta exactamente 1 punto", () => {
    expect(casiPremio(7, premio)).toEqual({ titulo: "¡Te falta 1 punto!", texto: "Una visita más y te llevás Trago de la casa.", premio: "Trago de la casa" });
    expect(casiPremio(6, premio)).toBeNull();
    expect(casiPremio(8, premio)).toBeNull();
    expect(casiPremio(7, null)).toBeNull();
  });
});
