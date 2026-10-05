/**
 * Límites de cada plan. Viven en la base (`planes.limites`, jsonb) para poder
 * cambiarlos desde /admin sin tocar código; acá se leen y validan.
 *
 * `null` en un límite numérico = ilimitado. Si el jsonb viene mal formado se
 * usa el valor MÁS restrictivo: ante la duda, el gating falla "cerrado"
 * (es preferible que un comercio no pueda algo a regalarle el plan Pro por un typo).
 */
type NivelEstadisticas = "basicas" | "avanzadas";

export type LimitesPlan = {
  locales: number | null;
  clientes: number | null;
  premios: number | null;
  promos: boolean;
  mensajes: boolean;
  estadisticas: NivelEstadisticas;
  /** Logo e imágenes propias en la tarjeta (sin esto, sólo colores). */
  diseno: boolean;
};

export const LIMITES_MINIMOS: LimitesPlan = {
  locales: 1,
  clientes: 0,
  premios: 0,
  promos: false,
  mensajes: false,
  estadisticas: "basicas",
  diseno: false,
};

function limiteNumerico(v: unknown, minimo: number): number | null {
  if (v === null) return null;
  if (typeof v === "number" && Number.isSafeInteger(v) && v >= 0) return v;
  return minimo;
}

export function leerLimites(json: unknown): LimitesPlan {
  if (!json || typeof json !== "object" || Array.isArray(json)) return { ...LIMITES_MINIMOS };
  const o = json as Record<string, unknown>;
  return {
    locales: "locales" in o ? limiteNumerico(o.locales, LIMITES_MINIMOS.locales!) : LIMITES_MINIMOS.locales,
    clientes: "clientes" in o ? limiteNumerico(o.clientes, LIMITES_MINIMOS.clientes!) : LIMITES_MINIMOS.clientes,
    premios: "premios" in o ? limiteNumerico(o.premios, LIMITES_MINIMOS.premios!) : LIMITES_MINIMOS.premios,
    promos: o.promos === true,
    mensajes: o.mensajes === true,
    estadisticas: o.estadisticas === "avanzadas" ? "avanzadas" : "basicas",
    diseno: o.diseno === true,
  };
}

const cantidad = (n: number | null, singular: string, plural: string) =>
  n === null ? `${plural.charAt(0).toUpperCase()}${plural.slice(1)} ilimitados` : `Hasta ${n.toLocaleString("es-AR")} ${n === 1 ? singular : plural}`;

/** Lo que incluye un plan, en castellano, para la página de precios y el panel. */
export function beneficiosPlan(l: LimitesPlan): string[] {
  const lista = [
    l.locales === 1 ? "1 local" : l.locales === null ? "Locales ilimitados" : `Hasta ${l.locales} locales`,
    l.clientes === null ? "Clientes ilimitados" : `Hasta ${l.clientes.toLocaleString("es-AR")} clientes con tarjeta`,
    "1 programa de puntos",
    cantidad(l.premios, "premio", "premios"),
    l.estadisticas === "avanzadas" ? "Estadísticas avanzadas" : "Estadísticas básicas: clientes, puntos y canjes del mes",
  ];
  if (l.promos) lista.push("Promos: puntos dobles y de cumpleaños");
  if (l.mensajes) lista.push("Mensajes a tus clientes en la Wallet");
  lista.push("1 llavero NFC incluido");
  return lista;
}
