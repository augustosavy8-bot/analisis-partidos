import { describe, expect, it } from "vitest";
import { formasTermino, plural } from "./terminos";

describe("términos del personal", () => {
  it("arma plurales en español", () => {
    expect(plural("mozo")).toBe("mozos");
    expect(plural("vendedor")).toBe("vendedores");
    expect(plural("profesor")).toBe("profesores");
    expect(plural("estilista")).toBe("estilistas");
  });
  it("devuelve todas las formas y cae en 'mozo' si el valor es desconocido", () => {
    expect(formasTermino("vendedor")).toEqual({ singular: "vendedor", plural: "vendedores", Singular: "Vendedor", Plural: "Vendedores" });
    expect(formasTermino("cualquiera").singular).toBe("mozo");
    expect(formasTermino(null).Plural).toBe("Mozos");
  });
});
