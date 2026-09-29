import { describe, expect, it } from "vitest";
import { ingresoBloqueado, localApp, resumenTarjeta, tokenBearer } from "./contrato";

const fila = {
  slug: "fairplay",
  nombre: "FairPlay",
  nombre_programa: null,
  logo_url: "https://s/logo.png",
  icono_url: null,
  color_primario: "#111111",
  color_secundario: "#c8f031",
  color_texto: null,
  color_etiqueta: null,
};

describe("contrato de la app", () => {
  it("local con colores efectivos, programa e ícono absoluto", () => {
    const l = localApp(fila, "https://fidelizacion-beta.vercel.app/");
    expect(l).toMatchObject({ slug: "fairplay", programa: "FairPlay", colores: { fondo: "#111111", texto: "#ffffff", etiqueta: "#c8f031", acento: "#c8f031" } });
    expect(l.icono).toMatch(/^https:\/\/fidelizacion-beta\.vercel\.app\/t\/fairplay\/icono\?s=180&v=/);
    expect(localApp({ ...fila, nombre_programa: "Club FairPlay" }, "https://x").programa).toBe("Club FairPlay");
  });

  it("resumen: próximo premio, faltan y premios disponibles", () => {
    const l = localApp(fila, "https://x");
    const premios = [
      { nombre: "Descuento 15%", puntos_necesarios: 8 },
      { nombre: "Medias de regalo", puntos_necesarios: 1 },
    ];
    expect(resumenTarjeta(l, 5, premios)).toMatchObject({ puntos: 5, proximo: { nombre: "Descuento 15%", puntos: 8, faltan: 3 }, premiosDisponibles: 1 });
    expect(resumenTarjeta(l, 9, premios).proximo).toEqual({ nombre: "Descuento 15%", puntos: 8, faltan: 0 });
    expect(resumenTarjeta(l, 0, []).proximo).toBeNull();
  });

  it("límite de ingreso por IP", () => {
    expect(ingresoBloqueado([])).toBe(false);
    expect(ingresoBloqueado(Array(5).fill({ exitoso: false }))).toBe(true);
    expect(ingresoBloqueado(Array(9).fill({ exitoso: true }))).toBe(false);
    expect(ingresoBloqueado(Array(10).fill({ exitoso: true }))).toBe(true);
  });

  it("lee el token Bearer", () => {
    expect(tokenBearer("Bearer abcdefghijklmnopqrstuvwxyz_-0123")).toBe("abcdefghijklmnopqrstuvwxyz_-0123");
    expect(tokenBearer("Bearer corto")).toBeNull();
    expect(tokenBearer("Basic abcdefghijklmnopqrstuvwxyz")).toBeNull();
    expect(tokenBearer(null)).toBeNull();
  });
});
