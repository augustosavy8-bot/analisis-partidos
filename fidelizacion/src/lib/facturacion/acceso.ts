/**
 * Control de acceso por plan (feature gating). Función pura: recibe la
 * suscripción y la configuración, y decide qué puede hacer el comercio.
 * El servidor la usa en cada acción; el navegador nunca decide esto.
 *
 * Niveles (de más a menos):
 *  - completo: todo lo que incluye su plan.
 *  - gracia: cobro fallido, pero todavía dentro de los días de gracia. Funciona
 *    todo; el panel muestra un aviso.
 *  - restringido: pasó la gracia. El panel no deja crear premios, ver
 *    estadísticas ni editar el programa. Sumar puntos sigue andando N días más.
 *  - sin_sumar: pasaron también esos días. Tampoco se suman puntos (el cliente ve
 *    un mensaje neutro). El canje de puntos ya ganados NUNCA se bloquea.
 *  - sin_suscripcion: nunca activó (o se le terminó la cortesía/el período).
 *
 * OJO: la regla de "¿puede sumar?" está duplicada en la base
 * (suma_habilitada_local, migración 026) porque el toque es una sola llamada a
 * Postgres. Si cambiás una, cambiá la otra (las dos tienen tests).
 */
import type { LimitesPlan } from "./planes";
import type { EstadoSuscripcion } from "./estado";

export type NivelAcceso = "completo" | "gracia" | "restringido" | "sin_sumar" | "sin_suscripcion";

export type SuscripcionAcceso = {
  estado: EstadoSuscripcion;
  limites: LimitesPlan;
  planNombre: string;
  pastDueDesde: string | null;
  currentPeriodEnd: string | null;
  cortesiaHasta: string | null;
};

export type ConfigAcceso = { diasGracia: number; diasSumarTrasGracia: number };

export type Acceso = {
  nivel: NivelAcceso;
  /** Estado de la suscripción que dio este nivel (para explicarle al comercio por qué). */
  estado: EstadoSuscripcion | null;
  limites: LimitesPlan | null;
  planNombre: string | null;
  /** Hasta cuándo dura el nivel actual (fin de la gracia, del sumar, de la cortesía o del período). */
  hasta: string | null;
};

const DIA = 86_400_000;

export function calcularAcceso(s: SuscripcionAcceso | null, cfg: ConfigAcceso, ahora: Date = new Date()): Acceso {
  if (!s) return { nivel: "sin_suscripcion", estado: null, limites: null, planNombre: null, hasta: null };
  const base = { estado: s.estado, limites: s.limites, planNombre: s.planNombre };
  const t = ahora.getTime();

  switch (s.estado) {
    case "cortesia":
      if (s.cortesiaHasta && new Date(s.cortesiaHasta).getTime() <= t) return { nivel: "sin_suscripcion", estado: s.estado, limites: null, planNombre: null, hasta: null };
      return { ...base, nivel: "completo", hasta: s.cortesiaHasta };
    case "trialing":
    case "authorized":
    case "pending":
      return { ...base, nivel: "completo", hasta: s.currentPeriodEnd };
    case "past_due": {
      const desde = s.pastDueDesde ? new Date(s.pastDueDesde).getTime() : t;
      const finGracia = desde + cfg.diasGracia * DIA;
      const finSumar = finGracia + cfg.diasSumarTrasGracia * DIA;
      if (t < finGracia) return { ...base, nivel: "gracia", hasta: new Date(finGracia).toISOString() };
      if (t < finSumar) return { ...base, nivel: "restringido", hasta: new Date(finSumar).toISOString() };
      return { ...base, nivel: "sin_sumar", hasta: null };
    }
    case "paused":
      // Pausada por el comercio: no se cobra. Usa lo que ya pagó hasta el fin del
      // período; después el panel queda restringido (sumar sigue) hasta que reactive.
      if (s.currentPeriodEnd && new Date(s.currentPeriodEnd).getTime() > t) return { ...base, nivel: "completo", hasta: s.currentPeriodEnd };
      return { ...base, nivel: "restringido", hasta: null };
    case "cancelled":
      // Cancelada con el período pago vigente: sigue con acceso completo hasta el final.
      if (s.currentPeriodEnd && new Date(s.currentPeriodEnd).getTime() > t) return { ...base, nivel: "completo", hasta: s.currentPeriodEnd };
      return { nivel: "sin_suscripcion", estado: s.estado, limites: null, planNombre: null, hasta: null };
  }
}

export type Funcion =
  | "sumar_puntos"
  | "canjear"
  | "crear_premio"
  | "editar_programa"
  | "promos"
  | "mensajes"
  | "estadisticas"
  | "estadisticas_avanzadas";

const PANEL_BLOQUEADO: NivelAcceso[] = ["restringido", "sin_sumar", "sin_suscripcion"];

/** ¿Puede usar esta función ahora? (plan + estado de la cuenta) */
export function puedeUsar(a: Acceso, f: Funcion): boolean {
  // Los puntos ya ganados son del cliente: canjear nunca se bloquea.
  if (f === "canjear") return true;
  if (f === "sumar_puntos") return a.nivel !== "sin_sumar" && a.nivel !== "sin_suscripcion";
  if (PANEL_BLOQUEADO.includes(a.nivel) || !a.limites) return false;
  switch (f) {
    case "promos":
      return a.limites.promos;
    case "mensajes":
      return a.limites.mensajes;
    case "estadisticas_avanzadas":
      return a.limites.estadisticas === "avanzadas";
    default:
      return true;
  }
}

export type Limite = "locales" | "clientes" | "premios";

/** ¿Tener `cantidad` (después de la acción) entra en el plan? null en el plan = ilimitado. */
export function dentroDelLimite(a: Acceso, l: Limite, cantidad: number): boolean {
  if (!a.limites) return false;
  const max = a.limites[l];
  return max === null || cantidad <= max;
}
