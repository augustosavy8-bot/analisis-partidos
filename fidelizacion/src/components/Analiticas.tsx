"use client";

import { Analytics, type BeforeSend } from "@vercel/analytics/next";

// Rutas con tokens en la dirección (pases de Wallet) o privadas: no se miden.
const PRIVADAS = /^\/(w|api|admin|auth)(\/|$)/;

/** Vercel Web Analytics sin datos sensibles: nunca manda la query (tokens de chips, links mágicos). */
const limpiar: BeforeSend = (evento) => {
  const url = new URL(evento.url);
  if (PRIVADAS.test(url.pathname)) return null;
  url.search = "";
  url.hash = "";
  return { ...evento, url: url.toString() };
};

export function Analiticas() {
  return <Analytics beforeSend={limpiar} />;
}
