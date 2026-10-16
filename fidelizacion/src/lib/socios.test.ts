import { describe, expect, it } from "vitest";
import { alClub, CLUB_POR_DEFECTO, coloresClub, comoSocio, delClub, nombreClub, socioDesde, varsTarjetaSocio } from "./socios";

const local = { nombre: "Di Vinee", color_primario: "#5a1a2b", color_secundario: "#e8c46a", color_texto: "#ffffff", color_etiqueta: "#e8c46a" };

describe("club de socios", () => {
  it("sin colores propios: dorada si la tarjeta común es oscura, negra con dorado si es clara", () => {
    expect(coloresClub(local)).toEqual(CLUB_POR_DEFECTO.dorada);
    expect(coloresClub({ ...local, color_primario: "#f4efe6" })).toEqual(CLUB_POR_DEFECTO.negra);
  });

  it("con colores elegidos en el panel, usa esos", () => {
    expect(coloresClub({ ...local, club_color_primario: "#101820", club_color_secundario: "#b08d57" })).toEqual({ primario: "#101820", secundario: "#b08d57" });
  });

  it("el local como socio: colores del club y texto/etiquetas recalculados para ese fondo", () => {
    const socio = comoSocio(local);
    expect(socio).toMatchObject({ nombre: "Di Vinee", color_primario: CLUB_POR_DEFECTO.dorada.primario, color_texto: null, color_etiqueta: null });
    expect(local.color_primario).toBe("#5a1a2b"); // no cambia el original
    expect(varsTarjetaSocio(local)).toEqual({
      "--pt-tarjeta-fondo": "#c9a45c",
      "--pt-tarjeta-texto": "#111311",
      "--pt-tarjeta-etiqueta": "#17140f", // el acento del club, que se lee sobre el dorado
      "--pt-tarjeta-acento": "#17140f",
    });
  });

  it("nombre del club y textos", () => {
    expect(nombreClub(local)).toBe("Club Di Vinee");
    expect(nombreClub({ ...local, club_nombre: "  Socios Di Vinee " })).toBe("Socios Di Vinee");
    expect(delClub("Club Di Vinee")).toBe("del Club Di Vinee");
    expect(delClub("Socios Di Vinee")).toBe("de Socios Di Vinee");
    expect(alClub("club di vinee")).toBe("al club di vinee");
    expect(alClub("Bodega Amigos")).toBe("a Bodega Amigos");
    expect(socioDesde("2026-10-16T02:00:00Z", "America/Argentina/Buenos_Aires")).toBe("10/2026");
    expect(socioDesde("2026-11-01T02:00:00Z", "America/Argentina/Buenos_Aires")).toBe("10/2026");
  });
});
