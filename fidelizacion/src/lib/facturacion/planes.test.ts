import { describe, expect, it } from "vitest";
import { LIMITES_MINIMOS, beneficiosPlan, leerLimites } from "./planes";

const BASICO = { locales: 1, clientes: 300, premios: 3, promos: false, mensajes: false, estadisticas: "basicas" };
const PRO = { locales: 3, clientes: null, premios: null, promos: true, mensajes: true, estadisticas: "avanzadas" };

describe("límites de los planes", () => {
  it("lee los planes cargados en la base", () => {
    expect(leerLimites(BASICO)).toEqual(BASICO);
    expect(leerLimites(PRO)).toEqual(PRO);
  });

  it("si el jsonb viene mal, falla cerrado (lo más restrictivo)", () => {
    expect(leerLimites(null)).toEqual(LIMITES_MINIMOS);
    expect(leerLimites("pro")).toEqual(LIMITES_MINIMOS);
    const roto = leerLimites({ locales: "tres", clientes: -5, promos: "sí", estadisticas: "todas" });
    expect(roto.locales).toBe(1);
    expect(roto.clientes).toBe(0);
    expect(roto.promos).toBe(false);
    expect(roto.estadisticas).toBe("basicas");
    // Un límite ausente NO significa ilimitado.
    expect(leerLimites({}).premios).toBe(0);
  });

  it("describe lo que incluye cada plan", () => {
    expect(beneficiosPlan(leerLimites(BASICO))).toEqual([
      "1 local",
      "Hasta 300 clientes con tarjeta",
      "1 programa de puntos",
      "Hasta 3 premios",
      "Estadísticas básicas: clientes, puntos y canjes del mes",
    ]);
    const pro = beneficiosPlan(leerLimites(PRO));
    expect(pro).toContain("Hasta 3 locales");
    expect(pro).toContain("Clientes ilimitados");
    expect(pro).toContain("Premios ilimitados");
    expect(pro).toContain("Mensajes a tus clientes en la Wallet");
  });
});
