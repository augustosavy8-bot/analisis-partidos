import { describe, expect, it } from "vitest";
import { contraste } from "./colores";
import { cssTema, temaDelLocal } from "./tema";

const paletas = {
  fairplay: { color_primario: "#111111", color_secundario: "#c8f031" },
  aurora: { color_primario: "#3b2a20", color_secundario: "#e6633a" },
  claro: { color_primario: "#f7f1e3", color_secundario: "#ffd400" },
  azul: { color_primario: "#1d4ed8", color_secundario: "#1e3a8a" },
  todoOscuro: { color_primario: "#0b0b0b", color_secundario: "#101010" },
};

describe("tema por bar", () => {
  for (const [nombre, local] of Object.entries(paletas)) {
    it(`${nombre}: todas las combinaciones cumplen contraste AA`, () => {
      const v = temaDelLocal(local).variables;
      expect(contraste(v["color-pt-ink"], v["color-pt-bg"])).toBeGreaterThanOrEqual(7);
      expect(contraste(v["color-pt-ink"], v["color-pt-surface"])).toBeGreaterThanOrEqual(4.5);
      expect(contraste(v["color-pt-ink-2"], v["color-pt-bg"])).toBeGreaterThanOrEqual(4.5);
      expect(contraste("#ffffff", v["color-pt-ink"])).toBeGreaterThanOrEqual(4.5); // botón principal
      expect(contraste(v["color-pt-ink"], v["color-pt-accent"])).toBeGreaterThanOrEqual(4.5); // botón acento
      expect(contraste(v["color-pt-accent-ink"], v["color-pt-bg"])).toBeGreaterThanOrEqual(4.5);
      expect(contraste(v["color-pt-ink"], v["color-pt-accent-soft"])).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("respeta los colores del bar cuando ya se leen bien", () => {
    const v = temaDelLocal(paletas.fairplay).variables;
    expect(v["color-pt-ink"]).toBe("#111111");
    expect(v["color-pt-accent"]).toBe("#c8f031");
    expect(v["pt-tarjeta-fondo"]).toBe("#111111");
    expect(v["pt-tarjeta-acento"]).toBe("#c8f031");
    const a = temaDelLocal(paletas.aurora).variables;
    expect(a["color-pt-ink"]).toBe("#3b2a20");
    // Muy saturado: la tinta se apaga (sigue siendo azul, pero sobria); el acento no se toca.
    const azul = temaDelLocal(paletas.azul).variables;
    expect(azul["color-pt-ink"]).not.toBe("#1d4ed8");
    expect(azul["pt-tarjeta-fondo"]).toBe("#1d4ed8");
  });

  it("la tarjeta usa el texto y las etiquetas del diseño si están guardados", () => {
    const v = temaDelLocal({ ...paletas.fairplay, color_texto: "#eeeeee", color_etiqueta: "#ff00aa" }).variables;
    expect(v["pt-tarjeta-texto"]).toBe("#eeeeee");
    expect(v["pt-tarjeta-etiqueta"]).toBe("#ff00aa");
  });

  it("genera CSS sólo con hex válidos", () => {
    const css = cssTema({ themeColor: "#fff", variables: { "color-pt-ink": "#111111", malo: "red;}body{x" } });
    expect(css).toBe(":root{--color-pt-ink:#111111}");
  });
});
