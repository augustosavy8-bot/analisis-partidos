import { describe, expect, it } from "vitest";
import { cuandoRelativo } from "./cuando";

const ZONA = "America/Argentina/Buenos_Aires";
// Miércoles 30/9/2026, 15:00 en Buenos Aires.
const AHORA = new Date("2026-09-30T18:00:00Z");

describe("cuándo fue un movimiento", () => {
  it("hoy y ayer con la hora del local", () => {
    expect(cuandoRelativo("2026-09-30T13:55:00Z", ZONA, AHORA)).toBe("Hoy, 10:55");
    expect(cuandoRelativo("2026-09-29T21:20:00Z", ZONA, AHORA)).toBe("Ayer, 18:20");
  });

  it("el día cambia a la medianoche del local, no en UTC", () => {
    // 1:30 UTC del 30 = 22:30 del 29 en Buenos Aires.
    expect(cuandoRelativo("2026-09-30T01:30:00Z", ZONA, AHORA)).toBe("Ayer, 22:30");
  });

  it("esta semana con el día; antes, la fecha", () => {
    expect(cuandoRelativo("2026-09-28T20:40:00Z", ZONA, AHORA)).toMatch(/^Lun, 17:40$/);
    expect(cuandoRelativo("2026-09-12T15:00:00Z", ZONA, AHORA)).toMatch(/^12 sep/);
    expect(cuandoRelativo("2025-12-20T15:00:00Z", ZONA, AHORA)).toMatch(/2025$/);
  });
});
