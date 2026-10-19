/**
 * "Te falta 1 punto": el aviso que más hace volver. Se manda cuando una suma deja
 * al cliente a un punto del próximo premio (Apple: texto de la notificación de
 * puntos; Google: un mensaje con aviso en lugar del aviso genérico de saldo).
 */
export function casiPremio(puntos: number, proximo: { nombre: string; puntos: number } | null) {
  if (!proximo || proximo.puntos - puntos !== 1) return null;
  return { titulo: "¡Te falta 1 punto!", texto: `Una visita más y te llevás ${proximo.nombre}.`, premio: proximo.nombre };
}
