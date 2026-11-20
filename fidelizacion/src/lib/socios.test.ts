import { describe, expect, it } from "vitest";
import { aclaracionPara, alClub, CLUB_POR_DEFECTO, coloresClub, comoSocio, delClub, esParaPremio, nombreClub, premiosPara, socioDesde, varsTarjetaSocio } from "./socios";

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

describe("premios por grupo", () => {
  const premios = [
    { nombre: "20 % socios", para: "socios" },
    { nombre: "5 % no socios", para: "no_socios" },
    { nombre: "Copa para todos", para: "todos" },
    { nombre: "Sin dato (premio viejo)", para: null },
  ];

  it("un socio ve los de todos y los de socios", () => {
    expect(premiosPara(premios, true).map((p) => p.nombre)).toEqual(["20 % socios", "Copa para todos", "Sin dato (premio viejo)"]);
  });

  it("un no socio ve los de todos y los de no socios", () => {
    expect(premiosPara(premios, false).map((p) => p.nombre)).toEqual(["5 % no socios", "Copa para todos", "Sin dato (premio viejo)"]);
  });

  it("aclara el grupo sólo en los premios de un grupo", () => {
    expect(aclaracionPara("socios")).toBe("socios");
    expect(aclaracionPara("no_socios")).toBe("no socios");
    expect(aclaracionPara("todos")).toBeNull();
    expect(aclaracionPara(null)).toBeNull();
  });

  it("sólo acepta los tres valores", () => {
    expect(["todos", "socios", "no_socios"].every(esParaPremio)).toBe(true);
    expect(esParaPremio("vip")).toBe(false);
    expect(esParaPremio(null)).toBe(false);
  });
});
