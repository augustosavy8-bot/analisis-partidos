import { describe, expect, it } from "vitest";
import { formatearWhatsapp, normalizarWhatsapp } from "./whatsapp";

describe("normalizarWhatsapp", () => {
  it.each([
    ["+54 9 341 123-4567", "+5493411234567"],
    ["+54 341 1234567", "+5493411234567"],
    ["5493411234567", "+5493411234567"],
    ["0341 15 123 4567", "+5493411234567"],
    ["341 15 1234567", "+5493411234567"],
    ["3411234567", "+5493411234567"],
    ["11 1234 5678", "+5491112345678"],
    ["011 15 1234-5678", "+5491112345678"],
    ["02966 15 12 3456", "+5492966123456"],
    ["0054 9 11 1234 5678", "+5491112345678"],
    ["+34 612 345 678", "+34612345678"],
    ["+1 (415) 555-2671", "+14155552671"],
  ])("%s → %s", (entrada, esperado) => {
    expect(normalizarWhatsapp(entrada)).toBe(esperado);
  });

  it.each(["", "abc", "1234", "341 123", "+0 123"])("rechaza %s", (entrada) => {
    expect(normalizarWhatsapp(entrada)).toBeNull();
  });
});

describe("formatearWhatsapp", () => {
  it("formatea Buenos Aires y el interior", () => {
    expect(formatearWhatsapp("+5491155550003")).toBe("11 5555-0003");
    expect(formatearWhatsapp("+5493411234567")).toBe("341 123-4567");
    expect(formatearWhatsapp("+34612345678")).toBe("+34612345678");
  });
});
