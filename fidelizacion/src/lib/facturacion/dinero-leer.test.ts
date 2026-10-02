import { describe, expect, it } from "vitest";
import { leerPesos } from "./dinero";

describe("leerPesos (montos escritos en el admin)", () => {
  it("entiende el formato argentino", () => {
    expect(leerPesos("25.000")).toBe(2_500_000);
    expect(leerPesos("25000")).toBe(2_500_000);
    expect(leerPesos("25.000,50")).toBe(2_500_050);
    expect(leerPesos("$ 40.000")).toBe(4_000_000);
    expect(leerPesos("0")).toBe(0);
  });
  it("no adivina: lo ambiguo o inválido es null", () => {
    expect(leerPesos("25000.50")).toBeNull();
    expect(leerPesos("abc")).toBeNull();
    expect(leerPesos("")).toBeNull();
    expect(leerPesos("-5")).toBeNull();
  });
});
