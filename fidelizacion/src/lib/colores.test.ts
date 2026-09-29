import { describe, expect, it } from "vitest";
import { coloresTarjeta, contraste, etiquetaPorDefecto, nivelContraste, textoPorDefecto } from "./colores";

describe("colores de la tarjeta", () => {
  it("contraste WCAG", () => {
    expect(contraste("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contraste("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  it("texto y etiquetas por defecto (lo que se usaba antes del panel de diseño)", () => {
    expect(textoPorDefecto("#111111")).toBe("#ffffff");
    expect(textoPorDefecto("#f7f8f6")).toBe("#111311");
    expect(etiquetaPorDefecto("#111111", "#c8f031")).toBe("#c8f031");
    expect(etiquetaPorDefecto("#f7f8f6", "#ffffff")).toBe("#111311");
  });

  it("usa lo elegido en el panel y, si no, lo calculado", () => {
    const fairplay = { color_primario: "#111111", color_secundario: "#c8f031" };
    expect(coloresTarjeta(fairplay)).toEqual({ fondo: "#111111", texto: "#ffffff", etiqueta: "#c8f031" });
    expect(coloresTarjeta({ ...fairplay, color_texto: "#eeeeee", color_etiqueta: "#ff0000" })).toEqual({
      fondo: "#111111",
      texto: "#eeeeee",
      etiqueta: "#ff0000",
    });
  });

  it("clasifica el contraste para avisar", () => {
    expect(nivelContraste("#111111", "#ffffff")).toBe("ok");
    expect(nivelContraste("#777777", "#ffffff")).toBe("bajo");
    expect(nivelContraste("#999999", "#ffffff")).toBe("muy-bajo");
  });
});
