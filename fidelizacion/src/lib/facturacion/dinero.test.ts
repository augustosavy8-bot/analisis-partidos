import { describe, expect, it } from "vitest";
import { centavosAPesos, formatearPesos, pesosACentavos } from "./dinero";

describe("plata en centavos", () => {
  it("formatea en pesos argentinos", () => {
    expect(formatearPesos(1500000)).toBe("$15.000");
    expect(formatearPesos(3000000)).toBe("$30.000");
    expect(formatearPesos(1500050)).toBe("$15.000,50");
    expect(formatearPesos(0)).toBe("$0");
  });

  it("convierte ida y vuelta con Mercado Pago sin perder centavos", () => {
    expect(centavosAPesos(1500000)).toBe(15000);
    expect(pesosACentavos(15000)).toBe(1500000);
    // El caso clásico del float: 0.1 + 0.2.
    expect(pesosACentavos(0.1 + 0.2)).toBe(30);
    expect(pesosACentavos(19.99)).toBe(1999);
  });

  it("rechaza montos inválidos", () => {
    expect(() => centavosAPesos(10.5)).toThrow();
    expect(() => centavosAPesos(-1)).toThrow();
    expect(() => pesosACentavos(Number.NaN)).toThrow();
  });
});
