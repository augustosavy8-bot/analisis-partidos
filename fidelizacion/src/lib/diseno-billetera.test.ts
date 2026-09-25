import { describe, expect, it } from "vitest";
import { mezclar, posicionesSellos, svgFranja, textoSobre } from "./diseno-billetera";

describe("diseño de billetera", () => {
  it("mezcla colores", () => {
    expect(mezclar("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mezclar("#000000", "#ffffff", 1)).toBe("#ffffff");
    expect(mezclar("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  it("ubica los sellos como el diseño (10 = 2 filas de 5)", () => {
    const p = posicionesSellos(10);
    expect(p).toHaveLength(10);
    expect(p.slice(0, 5).map((s) => s.x)).toEqual([400, 520, 640, 760, 880]);
    expect(new Set(p.map((s) => s.y)).size).toBe(2);
    expect(new Set(posicionesSellos(12).map((s) => s.y)).size).toBe(3);
    expect(posicionesSellos(4).every((s) => s.y === 216)).toBe(true);
  });

  it("pinta los sellos llenos con los colores del local", () => {
    const svg = svgFranja({ primario: "#111111", acento: "#c8f031", puntos: 3, meta: 5 });
    expect(svg.match(/stroke="#111111" stroke-width/g)).toHaveLength(3);
    expect(svg.match(/stroke="#D1CECC" stroke-width="10/g)).toHaveLength(2);
  });

  it("elige texto legible", () => {
    expect(textoSobre("#111111")).toBe("#F6F4EF");
    expect(textoSobre("#fafafa")).toBe("#1c1917");
  });
});
