"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/** Si algo explota al dibujar la página: se avisa a Sentry y se ofrece reintentar. */
export default function ErrorGlobal({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="es-AR">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, background: "#f7f8f6", color: "#111311" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 22 }}>Algo salió mal</h1>
          <p style={{ color: "#656a65" }}>Ya nos llegó el aviso. Probá de nuevo en un momento.</p>
          <button onClick={reset} style={{ marginTop: 12, padding: "12px 24px", borderRadius: 999, border: 0, background: "#111311", color: "#fff", fontSize: 16 }}>
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
