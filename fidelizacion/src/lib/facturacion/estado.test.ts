import { describe, expect, it } from "vitest";
import { estadoInicial, sumarMeses } from "./estado";
import { mensajeErrorMp, resumenErrorMp } from "./errores-mp";

const AHORA = new Date("2026-09-30T12:00:00Z");

describe("estado inicial de la suscripción", () => {
  it("autorizada con prueba → trialing hasta el próximo cobro que informa MP", () => {
    expect(estadoInicial({ status: "authorized", next_payment_date: "2026-10-14T12:00:00.000-04:00" }, 14, AHORA)).toEqual({
      estado: "trialing",
      trialEndsAt: "2026-10-14T16:00:00.000Z",
      currentPeriodEnd: "2026-10-14T16:00:00.000Z",
    });
  });

  it("si MP no manda la fecha, la estima con los días de prueba", () => {
    expect(estadoInicial({ status: "authorized" }, 14, AHORA).trialEndsAt).toBe("2026-10-14T12:00:00.000Z");
  });

  it("sin prueba → authorized por un mes", () => {
    expect(estadoInicial({ status: "authorized" }, 0, AHORA)).toMatchObject({ estado: "authorized", trialEndsAt: null, currentPeriodEnd: "2026-10-30T12:00:00.000Z" });
    expect(estadoInicial({ status: "pending" }, 14, AHORA).estado).toBe("pending");
    expect(() => estadoInicial({ status: "cancelled" }, 14, AHORA)).toThrow();
  });

  it("los meses son de calendario", () => {
    expect(sumarMeses(new Date("2026-01-31T10:00:00Z"), 1).toISOString()).toBe("2026-02-28T10:00:00.000Z");
    expect(sumarMeses(new Date("2028-01-31T10:00:00Z"), 1).toISOString()).toBe("2028-02-29T10:00:00.000Z");
    expect(sumarMeses(new Date("2026-12-15T10:00:00Z"), 1).toISOString()).toBe("2027-01-15T10:00:00.000Z");
  });
});

describe("errores de Mercado Pago", () => {
  it("traduce los casos comunes sin mostrar detalles técnicos", () => {
    expect(mensajeErrorMp({ status: 400, message: "Card token was used", cause: [] })).toMatch(/vencieron/);
    expect(mensajeErrorMp({ status: 400, message: "cc_rejected_insufficient_amount" })).toMatch(/rechazada/);
    expect(mensajeErrorMp({ status: 400, message: "Both payer and collector must be real or test users" })).toMatch(/compradora de prueba/);
    expect(mensajeErrorMp({ status: 400, message: "User bad request" })).toMatch(/compradora de prueba/);
    expect(mensajeErrorMp({ status: 401, message: "unauthorized" })).toMatch(/conectarnos/);
    expect(mensajeErrorMp(new Error("boom"))).toMatch(/Probá de nuevo/);
  });

  it("el resumen para logs incluye las causas", () => {
    expect(resumenErrorMp({ status: 400, message: "bad", cause: [{ code: 123, description: "x" }] })).toBe("[MP 400] bad — 123: x");
  });
});
