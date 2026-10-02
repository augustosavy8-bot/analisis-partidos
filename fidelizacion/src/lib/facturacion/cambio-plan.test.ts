import { describe, expect, it } from "vitest";
import { decidirCambioPlan } from "./cambio-plan";

const base = { precioActual: 1500000, precioNuevo: 3000000, locales: 1, localesNuevo: 3 };

describe("cambio de plan sin prorrateo", () => {
  it("subir es inmediato; bajar, al fin del período", () => {
    expect(decidirCambioPlan({ ...base, estado: "authorized" })).toEqual({ ok: true, inmediato: true });
    expect(decidirCambioPlan({ ...base, estado: "authorized", precioActual: 3000000, precioNuevo: 1500000, localesNuevo: 1 })).toEqual({
      ok: true,
      inmediato: false,
    });
  });

  it("en prueba gratis, inmediato en los dos sentidos", () => {
    expect(decidirCambioPlan({ ...base, estado: "trialing", precioActual: 3000000, precioNuevo: 1500000, localesNuevo: 1 })).toEqual({
      ok: true,
      inmediato: true,
    });
  });

  it("impaga, pausada o cortesía: no se puede", () => {
    for (const estado of ["past_due", "paused", "cortesia", "cancelled", "pending"] as const) {
      expect(decidirCambioPlan({ ...base, estado }).ok).toBe(false);
    }
  });

  it("no deja bajar a un plan con menos locales de los que tiene", () => {
    const r = decidirCambioPlan({ ...base, estado: "authorized", precioActual: 3000000, precioNuevo: 1500000, locales: 2, localesNuevo: 1 });
    expect(r.ok).toBe(false);
  });
});
