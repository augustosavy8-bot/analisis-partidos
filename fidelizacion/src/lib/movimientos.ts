/** Textos e íconos de un movimiento, compartidos por la tarjeta, el pase y el panel. */
export type TipoMovimiento = "suma" | "canje" | "regalo";
export type MotivoMovimiento = "promo" | "bienvenida" | "cumple" | null;

type Mov = { tipo: TipoMovimiento; puntos: number; motivo: MotivoMovimiento; detalle: string | null };

export function iconoMovimiento(m: Mov): string {
  if (m.tipo === "canje") return "🎁";
  if (m.tipo === "regalo") return m.motivo === "cumple" ? "🎂" : "👋";
  return `+${m.puntos}`;
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
