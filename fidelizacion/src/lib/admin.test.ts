import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/panel", () => ({ requerirUsuario: vi.fn() }));
const { slugDesde, contraseñaTemporal } = await import("./admin");

describe("helpers de admin", () => {
  it("genera slugs limpios", () => {
    expect(slugDesde("Café Aurora")).toBe("cafe-aurora");
    expect(slugDesde("  Bar & Barbería Ñandú!! ")).toBe("bar-barberia-nandu");
  });
  it("genera contraseñas temporales con formato palabra-palabra-número", () => {
    expect(contraseñaTemporal()).toMatch(/^[a-z]+-[a-z]+-\d{4}$/);
  });
});
