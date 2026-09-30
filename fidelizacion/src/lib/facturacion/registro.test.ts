import { describe, expect, it } from "vitest";
import { cuitValido, limpiarCuit, validarRegistro } from "./registro";

const BASE = {
  nombre: "Augusto",
  email: "Dueño@Bar.com ",
  password: "una-clave-larga",
  comercio: "Bar Central",
  rubro: "Bar",
  acepto: "on",
};

describe("registro del comercio", () => {
  it("CUIT con dígito verificador", () => {
    expect(cuitValido("20123456786")).toBe(true);
    expect(cuitValido("20123456780")).toBe(false);
    expect(cuitValido("30500010912")).toBe(true);
    expect(cuitValido("2012345678")).toBe(false);
    expect(limpiarCuit("20-12345678-6")).toBe("20123456786");
  });

  it("acepta el mínimo y normaliza", () => {
    const r = validarRegistro({ ...BASE, plan: "pro" });
    expect("datos" in r && r.datos).toMatchObject({ email: "dueño@bar.com", comercio: "Bar Central", cuit: null, plan: "pro" });
  });

  it("datos fiscales opcionales pero válidos si vienen", () => {
    const ok = validarRegistro({ ...BASE, cuit: "20-12345678-6", condicion_fiscal: "monotributo", razon_social: "Bar Central SRL" });
    expect("datos" in ok && ok.datos.cuit).toBe("20123456786");
    expect(validarRegistro({ ...BASE, cuit: "20-12345678-0" })).toEqual({ error: expect.stringContaining("CUIT") });
    expect(validarRegistro({ ...BASE, condicion_fiscal: "otra" })).toEqual({ error: expect.stringContaining("condición") });
  });

  it("rechaza lo que falta", () => {
    expect("error" in validarRegistro({ ...BASE, password: "corta" })).toBe(true);
    expect("error" in validarRegistro({ ...BASE, rubro: "Casino" })).toBe(true);
    expect("error" in validarRegistro({ ...BASE, acepto: "" })).toBe(true);
    // Un plan con caracteres raros se ignora (no rompe el registro).
    const r = validarRegistro({ ...BASE, plan: "<script>" });
    expect("datos" in r && r.datos.plan).toBe(null);
  });
});
