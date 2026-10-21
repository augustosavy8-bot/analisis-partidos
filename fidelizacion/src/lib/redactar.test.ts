import { describe, expect, it } from "vitest";
import { redactarEvento, redactarTexto } from "./redactar";

describe("redactar", () => {
  it("tapa el token del link del pase", () => {
    const url = "https://pointclub.app/w/2405faef-1b59-477b-867e-70d0b2fc21a2/abcDEF123_-xyz987654321";
    expect(redactarTexto(url)).toBe("https://pointclub.app/w/[serial]/[token]");
    expect(redactarEvento({ request: { url }, breadcrumbs: [{ data: { to: url } }] })).toEqual({
      request: { url: "https://pointclub.app/w/[serial]/[token]" },
      breadcrumbs: [{ data: { to: "https://pointclub.app/w/[serial]/[token]" } }],
    });
    expect(redactarTexto("/t/nucia")).toBe("/t/nucia");
  });
});
