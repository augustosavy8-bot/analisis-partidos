/** Estados de un pedido del kit, en palabras del comercio. */
export const ESTADOS_PEDIDO: Record<string, { texto: string; tono: string }> = {
  pendiente_pago: { texto: "Esperando el pago", tono: "text-amber-700" },
  pagado: { texto: "Pagado", tono: "text-pt-accent-ink" },
  preparando: { texto: "Preparando", tono: "text-pt-accent-ink" },
  enviado: { texto: "Enviado", tono: "text-pt-accent-ink" },
  listo_retiro: { texto: "Listo para retirar", tono: "text-pt-accent-ink" },
  entregado: { texto: "Entregado", tono: "text-pt-ink-2" },
  expirado: { texto: "Venció sin pagar", tono: "text-pt-ink-3" },
  cancelado: { texto: "Cancelado", tono: "text-pt-ink-3" },
  reembolsado: { texto: "Reembolsado", tono: "text-pt-ink-2" },
};
