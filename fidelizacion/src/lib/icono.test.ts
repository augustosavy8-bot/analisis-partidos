import { describe, expect, it } from "vitest";
import { dimensionesPng, fuenteIcono, pathIcono, validarIcono } from "./icono";

/** Cabecera PNG mínima (firma + IHDR) con las medidas pedidas. */
function png(ancho: number, alto: number, extra = 0) {
  const b = new Uint8Array(33 + extra);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const v = new DataView(b.buffer);
  v.setUint32(16, ancho);
  v.setUint32(20, alto);
  return b;
}

describe("ícono del local", () => {
  it("lee las medidas del PNG", () => {
    expect(dimensionesPng(png(1024, 1024))).toEqual({ ancho: 1024, alto: 1024 });
    expect(dimensionesPng(new TextEncoder().encode("GIF89a no es png ni de casualidad"))).toBeNull();
  });

  it("acepta PNG cuadrado de 512 o más", () => {
    expect(validarIcono(png(512, 512))).toBeNull();
    expect(validarIcono(png(1024, 1024))).toBeNull();
  });

  it("rechaza con un motivo claro", () => {
    expect(validarIcono(new Uint8Array())).toMatch(/Elegí/);
    expect(validarIcono(new TextEncoder().encode("\xff\xd8\xff jpeg jpeg jpeg jpeg jpeg"))).toMatch(/PNG/);
    expect(validarIcono(png(800, 600))).toMatch(/cuadrado.*800×600/);
    expect(validarIcono(png(256, 256))).toMatch(/al menos 512×512/);
    expect(validarIcono(png(8000, 8000))).toMatch(/demasiado grande/);
    expect(validarIcono(png(512, 512, 2 * 1024 * 1024))).toMatch(/2 MB/);
  });

  it("usa el ícono, si no el logo, si no la inicial", () => {
    expect(fuenteIcono({ icono_url: "https://s/i.png", logo_url: "https://s/l.png" })).toEqual({ tipo: "icono", url: "https://s/i.png" });
    expect(fuenteIcono({ icono_url: null, logo_url: "https://s/l.png" })).toEqual({ tipo: "logo", url: "https://s/l.png" });
    expect(fuenteIcono({ icono_url: null, logo_url: null })).toEqual({ tipo: "inicial" });
  });

  it("guarda en {local_id}/icon.png", () => {
    expect(pathIcono("7009fb1c")).toBe("7009fb1c/icon.png");
  });
});
