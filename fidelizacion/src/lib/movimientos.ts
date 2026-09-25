/** Textos e íconos de un movimiento, compartidos por la tarjeta, el pase y el panel. */
export type TipoMovimiento = "suma" | "canje" | "regalo";
export type MotivoMovimiento = "promo" | "bienvenida" | "cumple" | null;

type Mov = { tipo: TipoMovimiento; puntos: number; motivo: MotivoMovimiento; detalle: string | null };

/** Ícono de Point para el movimiento. */
export function nombreIconoMovimiento(m: Pick<Mov, "tipo">): "sumar-punto" | "premio" | "canjear" {
  return m.tipo === "canje" ? "canjear" : m.tipo === "regalo" ? "premio" : "sumar-punto";
}

/** Para el cliente: "Sumaste 2 puntos · Happy hour". */
export function textoMovimiento(m: Mov): string {
  if (m.tipo === "canje") return `Canjeaste ${-m.puntos} puntos`;
  if (m.tipo === "regalo") {
    return `${m.motivo === "cumple" ? "Regalo de cumple" : "Regalo de bienvenida"}: +${m.puntos}`;
  }
  const base = m.puntos === 1 ? "Sumaste 1 punto" : `Sumaste ${m.puntos} puntos`;
  return m.detalle ? `${base} · ${m.detalle}` : base;
}

/** Para el panel: "sumó 2 puntos (Happy hour)". */
export function textoMovimientoPanel(m: Mov, premio?: string | null): string {
  if (m.tipo === "canje") return `canjeó ${premio ?? "un premio"} (${-m.puntos} pts)`;
  if (m.tipo === "regalo") return `recibió ${m.puntos} pts de regalo (${m.motivo === "cumple" ? "cumple" : "bienvenida"})`;
  const base = m.puntos === 1 ? "sumó 1 punto" : `sumó ${m.puntos} puntos`;
  return m.detalle ? `${base} (${m.detalle})` : base;
}

/** Título corto para el historial (los puntos van aparte): "Visita", "Happy hour", "Regalo de cumple". */
export function tituloMovimiento(m: Mov): string {
  if (m.tipo === "canje") return "Canjeaste un premio";
  if (m.tipo === "regalo") return m.motivo === "cumple" ? "Regalo de cumple" : "Regalo de bienvenida";
  return m.detalle ?? "Visita";
}
