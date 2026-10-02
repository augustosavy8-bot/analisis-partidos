import { describe, expect, it } from "vitest";
import { avisoDeCuenta } from "./aviso-cuenta";
import type { Acceso } from "./acceso";

const AHORA = new Date("2026-10-10T12:00:00Z");
const acc = (a: Partial<Acceso>): Acceso => ({ nivel: "completo", estado: "authorized", limites: null, planNombre: "Pro", hasta: null, ...a });

describe("cartel del estado de la cuenta", () => {
  it("al día: no molesta", () => {
    expect(avisoDeCuenta(acc({}), AHORA)).toBeNull();
    expect(avisoDeCuenta(acc({ estado: "cortesia" }), AHORA)).toBeNull();
    expect(avisoDeCuenta(acc({ estado: "cortesia", hasta: "2027-01-01T00:00:00Z" }), AHORA)).toBeNull();
  });

  it("cobro fallido: aviso en gracia, grave después", () => {
    expect(avisoDeCuenta(acc({ nivel: "gracia", estado: "past_due", hasta: "2026-10-15T12:00:00Z" }), AHORA)?.tono).toBe("aviso");
    expect(avisoDeCuenta(acc({ nivel: "restringido", estado: "past_due" }), AHORA)?.tono).toBe("grave");
    expect(avisoDeCuenta(acc({ nivel: "sin_sumar", estado: "past_due" }), AHORA)?.titulo).toMatch(/pausado/);
  });

  it("pausada, cancelada y cortesía por vencer explican hasta cuándo", () => {
    expect(avisoDeCuenta(acc({ nivel: "restringido", estado: "paused" }), AHORA)?.boton).toBe("Reactivar");
    expect(avisoDeCuenta(acc({ estado: "cancelled", hasta: "2026-10-20T12:00:00Z" }), AHORA)?.texto).toMatch(/20 de octubre/);
    expect(avisoDeCuenta(acc({ estado: "cortesia", hasta: "2026-10-20T12:00:00Z" }), AHORA)?.titulo).toMatch(/cortesía/);
    expect(avisoDeCuenta(acc({ nivel: "sin_suscripcion", estado: null }), AHORA)?.boton).toBe("Activar");
  });
});
