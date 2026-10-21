/**
 * Tapa los tokens que viajan en el PATH de una URL (no en la query): el link de la
 * billetera es /w/<serial>/<token> y sirve para siempre. Lo usa Sentry antes de
 * mandar errores y breadcrumbs (la query ya no se manda).
 */
const LINK_PASE = /\/w\/[0-9a-f-]{8,}\/[A-Za-z0-9_-]{8,}/g;

export function redactarTexto(s: string): string {
  return s.replace(LINK_PASE, "/w/[serial]/[token]");
}

/** Recorre el evento y tapa los links de pase en cualquier texto (con tope de profundidad). */
export function redactarEvento<T>(valor: T, profundidad = 0): T {
  if (typeof valor === "string") return redactarTexto(valor) as T;
  if (profundidad > 8 || valor === null || typeof valor !== "object") return valor;
  if (Array.isArray(valor)) return valor.map((v) => redactarEvento(v, profundidad + 1)) as T;
  const salida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(valor as Record<string, unknown>)) salida[k] = redactarEvento(v, profundidad + 1);
  return salida as T;
}
