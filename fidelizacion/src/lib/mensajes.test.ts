import { describe, expect, it } from "vitest";
import { textoAlcance } from "./mensajes";

describe("textoAlcance", () => {
  const base = { estado: "enviado" as const, google_enviados: 0, google_fallidos: 0, apple_pases: 0 };
  it("resume a cuántas tarjetas llegó", () => {
    expect(textoAlcance({ ...base, google_enviados: 8, apple_pases: 4 })).toBe("Llegó a 12 tarjetas (8 Google, 4 Apple)");
    expect(textoAlcance({ ...base, apple_pases: 1 })).toBe("Llegó a 1 tarjeta (1 Apple)");
    expect(textoAlcance({ ...base, google_enviados: 2, google_fallidos: 1 })).toBe("Llegó a 2 tarjetas (2 Google) · 1 con error");
  });
  it("estados especiales", () => {
    expect(textoAlcance(base)).toMatch(/Nadie/);
    expect(textoAlcance({ ...base, estado: "enviando" })).toBe("Enviando…");
    expect(textoAlcance({ ...base, estado: "error" })).toMatch(/no cuenta/);
  });
});
