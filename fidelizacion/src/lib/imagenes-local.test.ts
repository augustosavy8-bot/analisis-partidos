import { describe, expect, it } from "vitest";
import { medidasImagen, pathBorrador, pathImagen, pathsPosibles, validarImagen } from "./imagenes-local";

/** Cabecera PNG mínima (firma + IHDR) con las medidas pedidas. */
function png(ancho: number, alto: number, extra = 0) {
  const b = new Uint8Array(33 + extra);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const v = new DataView(b.buffer);
  v.setUint32(16, ancho);
  v.setUint32(20, alto);
  return b;
}

/** JPEG mínimo: SOI + APP0 + SOF2 (progresivo) con las medidas. */
function jpeg(ancho: number, alto: number) {
  return new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x04, 0x4a, 0x46,
    0xff, 0xc2, 0x00, 0x11, 0x08, alto >> 8, alto & 255, ancho >> 8, ancho & 255, 0x03, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ]);
}

describe("medidas", () => {
  it("lee PNG y JPEG", () => {
    expect(medidasImagen(png(1024, 1024))).toEqual({ formato: "png", ancho: 1024, alto: 1024 });
    expect(medidasImagen(jpeg(1125, 369))).toEqual({ formato: "jpeg", ancho: 1125, alto: 369 });
    expect(medidasImagen(new TextEncoder().encode("GIF89a no es png ni jpeg"))).toBeNull();
  });
});

describe("ícono", () => {
  it("PNG cuadrado de 512 o más", () => {
    expect(validarImagen("icono", png(512, 512))).toBeNull();
    expect(validarImagen("icono", png(800, 600))).toMatch(/cuadrado.*800×600/);
    expect(validarImagen("icono", png(256, 256))).toMatch(/al menos 512×512/);
    expect(validarImagen("icono", jpeg(600, 600))).toMatch(/PNG/);
    expect(validarImagen("icono", png(8000, 8000))).toMatch(/demasiado grande/);
    expect(validarImagen("icono", png(512, 512, 2 * 1024 * 1024))).toMatch(/2 MB/);
    expect(validarImagen("icono", new Uint8Array())).toMatch(/Elegí/);
  });
});

describe("logo", () => {
  it("PNG de al menos 150 de alto, cualquier proporción", () => {
    expect(validarImagen("logo", png(900, 300))).toBeNull();
    expect(validarImagen("logo", png(400, 100))).toMatch(/muy chico/);
    expect(validarImagen("logo", jpeg(900, 300))).toMatch(/PNG/);
  });
});

describe("franja", () => {
  it("PNG o JPG apaisado de 1032+ de ancho", () => {
    expect(validarImagen("franja", jpeg(1125, 369))).toBeNull();
    expect(validarImagen("franja", png(2064, 672))).toBeNull();
    expect(validarImagen("franja", png(1000, 1000))).toMatch(/apaisada/);
    expect(validarImagen("franja", png(900, 300))).toMatch(/1032 de ancho/);
  });
});

describe("paths en Storage", () => {
  it("usa {local_id}/icon.png y un borrador aparte", () => {
    expect(pathImagen("abc", "icono", "png")).toBe("abc/icon.png");
    expect(pathImagen("abc", "franja", "jpeg")).toBe("abc/franja.jpg");
    expect(pathBorrador("abc", "logo", "png")).toBe("abc/borrador/logo.png");
    expect(pathsPosibles("abc", "franja")).toEqual(["abc/franja.png", "abc/franja.jpg"]);
  });
});
