import { describe, expect, it } from "vitest";
import { efectoDeCuota, estadoDesdePreapproval, estadoTrasCuota, puedeTransicionar } from "./transiciones";
import { calcularAcceso, dentroDelLimite, puedeUsar, type SuscripcionAcceso } from "./acceso";
import { leerLimites } from "./planes";

const AHORA = new Date("2026-10-10T12:00:00Z");
const BASICO = leerLimites({ locales: 1, clientes: 300, premios: 3, promos: false, mensajes: false, estadisticas: "basicas" });
const PRO = leerLimites({ locales: 3, clientes: null, premios: null, promos: true, mensajes: true, estadisticas: "avanzadas" });
const CFG = { diasGracia: 10, diasSumarTrasGracia: 7 };
const susc = (o: Partial<SuscripcionAcceso>): SuscripcionAcceso => ({
  estado: "authorized", limites: BASICO, planNombre: "Básico", pastDueDesde: null, currentPeriodEnd: null, cortesiaHasta: null, ...o,
});

describe("transiciones de la suscripción", () => {
  it("cancelada es terminal", () => {
    expect(puedeTransicionar("cancelled", "authorized")).toBe(false);
    expect(puedeTransicionar("authorized", "cancelled")).toBe(true);
    expect(puedeTransicionar("past_due", "authorized")).toBe(true);
    expect(puedeTransicionar("cortesia", "past_due")).toBe(false);
  });

  it("el preapproval decide pausa, cancelación y reactivación", () => {
    expect(estadoDesdePreapproval("cancelled", "trialing", null, AHORA)).toBe("cancelled");
    expect(estadoDesdePreapproval("paused", "authorized", null, AHORA)).toBe("paused");
    expect(estadoDesdePreapproval("authorized", "pending", "2026-10-20T00:00:00Z", AHORA)).toBe("trialing");
    expect(estadoDesdePreapproval("authorized", "paused", "2026-10-01T00:00:00Z", AHORA)).toBe("authorized");
    // authorized no pisa un cobro fallido: eso lo arregla una cuota cobrada.
    expect(estadoDesdePreapproval("authorized", "past_due", null, AHORA)).toBe("past_due");
    expect(estadoDesdePreapproval("authorized", "cancelled", null, AHORA)).toBe("cancelled");
  });

  it("la cuota decide si se cobró", () => {
    expect(efectoDeCuota({ status: "processed", payment: { status: "approved" } })).toEqual({ tipo: "cobrada" });
    expect(efectoDeCuota({ status: "recycling", payment: { status: "rejected" } })).toEqual({ tipo: "fallida" });
    expect(efectoDeCuota({ status: "processed", payment: { status: "rejected" } })).toEqual({ tipo: "fallida" });
    expect(efectoDeCuota({ status: "scheduled" })).toEqual({ tipo: "sin_cambios" });
    expect(efectoDeCuota({ status: "waiting for gateway" })).toEqual({ tipo: "sin_cambios" });
  });

  it("aplicar la cuota respeta las reglas", () => {
    expect(estadoTrasCuota("trialing", { tipo: "cobrada" })).toBe("authorized");
    expect(estadoTrasCuota("authorized", { tipo: "fallida" })).toBe("past_due");
    expect(estadoTrasCuota("past_due", { tipo: "cobrada" })).toBe("authorized");
    // Una cuota que llega tarde no resucita una cancelada.
    expect(estadoTrasCuota("cancelled", { tipo: "cobrada" })).toBe("cancelled");
    expect(estadoTrasCuota("paused", { tipo: "fallida" })).toBe("paused");
  });
});

describe("control de acceso por plan", () => {
  it("pending tiene tope: 48 h completo, después restringido y al final no suma", () => {
    const creada = (horas: number) => new Date(AHORA.getTime() - horas * 3_600_000).toISOString();
    expect(calcularAcceso(susc({ estado: "pending", creadaEn: creada(1) }), CFG, AHORA).nivel).toBe("completo");
    expect(calcularAcceso(susc({ estado: "pending", creadaEn: creada(49) }), CFG, AHORA).nivel).toBe("restringido");
    const vieja = calcularAcceso(susc({ estado: "pending", creadaEn: creada(48 + 8 * 24) }), CFG, AHORA);
    expect(vieja.nivel).toBe("sin_sumar");
    expect(puedeUsar(vieja, "sumar_puntos")).toBe(false);
    expect(puedeUsar(vieja, "canjear")).toBe(true);
  });

  it("activa o en prueba: todo lo del plan", () => {
    const a = calcularAcceso(susc({ estado: "trialing" }), CFG, AHORA);
    expect(a.nivel).toBe("completo");
    expect(puedeUsar(a, "crear_premio")).toBe(true);
    expect(puedeUsar(a, "promos")).toBe(false); // Básico no tiene promos
    expect(puedeUsar(a, "estadisticas_avanzadas")).toBe(false);
    const pro = calcularAcceso(susc({ limites: PRO, planNombre: "Pro" }), CFG, AHORA);
    expect(puedeUsar(pro, "promos") && puedeUsar(pro, "mensajes") && puedeUsar(pro, "estadisticas_avanzadas")).toBe(true);
  });

  it("límites: null es ilimitado", () => {
    const b = calcularAcceso(susc({}), CFG, AHORA);
    expect(dentroDelLimite(b, "premios", 3)).toBe(true);
    expect(dentroDelLimite(b, "premios", 4)).toBe(false);
    const p = calcularAcceso(susc({ limites: PRO }), CFG, AHORA);
    expect(dentroDelLimite(p, "premios", 500)).toBe(true);
    expect(dentroDelLimite(p, "locales", 4)).toBe(false);
  });

  it("cobro fallido: gracia → restringido → sin sumar; el canje nunca se bloquea", () => {
    const enGracia = calcularAcceso(susc({ estado: "past_due", pastDueDesde: "2026-10-05T12:00:00Z" }), CFG, AHORA);
    expect(enGracia.nivel).toBe("gracia");
    expect(puedeUsar(enGracia, "crear_premio") && puedeUsar(enGracia, "sumar_puntos")).toBe(true);

    const restringido = calcularAcceso(susc({ estado: "past_due", pastDueDesde: "2026-09-27T12:00:00Z" }), CFG, AHORA);
    expect(restringido.nivel).toBe("restringido");
    expect(puedeUsar(restringido, "crear_premio")).toBe(false);
    expect(puedeUsar(restringido, "estadisticas")).toBe(false);
    expect(puedeUsar(restringido, "sumar_puntos")).toBe(true);

    const sinSumar = calcularAcceso(susc({ estado: "past_due", pastDueDesde: "2026-09-01T12:00:00Z" }), CFG, AHORA);
    expect(sinSumar.nivel).toBe("sin_sumar");
    expect(puedeUsar(sinSumar, "sumar_puntos")).toBe(false);
    expect(puedeUsar(sinSumar, "canjear")).toBe(true);
  });

  it("cortesía, cancelada con período vigente y sin suscripción", () => {
    expect(calcularAcceso(susc({ estado: "cortesia", limites: PRO }), CFG, AHORA).nivel).toBe("completo");
    expect(calcularAcceso(susc({ estado: "cortesia", cortesiaHasta: "2026-10-01T00:00:00Z" }), CFG, AHORA).nivel).toBe("sin_suscripcion");
    expect(calcularAcceso(susc({ estado: "cancelled", currentPeriodEnd: "2026-10-20T00:00:00Z" }), CFG, AHORA).nivel).toBe("completo");
    expect(calcularAcceso(susc({ estado: "cancelled", currentPeriodEnd: "2026-10-01T00:00:00Z" }), CFG, AHORA).nivel).toBe("sin_suscripcion");
    const nada = calcularAcceso(null, CFG, AHORA);
    expect(puedeUsar(nada, "crear_premio") || puedeUsar(nada, "sumar_puntos")).toBe(false);
    expect(puedeUsar(nada, "canjear")).toBe(true);
  });

  it("pausada: usa lo pagado hasta el fin del período, después restringida unos días y luego sin sumar", () => {
    expect(calcularAcceso(susc({ estado: "paused", currentPeriodEnd: "2026-10-20T00:00:00Z" }), CFG, AHORA).nivel).toBe("completo");
    const pausada = calcularAcceso(susc({ estado: "paused", currentPeriodEnd: "2026-10-05T00:00:00Z" }), CFG, AHORA);
    expect(pausada.nivel).toBe("restringido");
    expect(puedeUsar(pausada, "sumar_puntos")).toBe(true);
    expect(puedeUsar(pausada, "editar_programa")).toBe(false);
    // Pausar no puede ser "sumar puntos gratis para siempre".
    const vieja = calcularAcceso(susc({ estado: "paused", currentPeriodEnd: "2026-09-01T00:00:00Z" }), CFG, AHORA);
    expect(vieja.nivel).toBe("sin_sumar");
    expect(puedeUsar(vieja, "sumar_puntos")).toBe(false);
    expect(puedeUsar(vieja, "canjear")).toBe(true);
  });
});
