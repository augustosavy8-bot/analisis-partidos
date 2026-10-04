/** Mensajes del local a sus clientes (notificación en la billetera). */
export const LIMITES_MENSAJE = { titulo: 40, texto: 150 } as const;

type EstadoEnvio = "enviando" | "enviado" | "error";

export type MensajeLocal = {
  id: string;
  titulo: string;
  texto: string;
  estado: EstadoEnvio;
  google_enviados: number;
  google_fallidos: number;
  apple_pases: number;
  created_at: string;
};

/** "Llegó a 12 clientes (8 Google, 4 Apple)". */
export function textoAlcance(m: Pick<MensajeLocal, "estado" | "google_enviados" | "apple_pases" | "google_fallidos">): string {
  if (m.estado === "enviando") return "Enviando…";
  if (m.estado === "error") return "No se pudo enviar (no cuenta para el límite)";
  const total = m.google_enviados + m.apple_pases;
  if (total === 0) return "Nadie tenía la tarjeta en la billetera todavía";
  const partes = [m.google_enviados && `${m.google_enviados} Google`, m.apple_pases && `${m.apple_pases} Apple`].filter(Boolean).join(", ");
  const base = `Llegó a ${total} ${total === 1 ? "tarjeta" : "tarjetas"} (${partes})`;
  return m.google_fallidos ? `${base} · ${m.google_fallidos} con error` : base;
}
