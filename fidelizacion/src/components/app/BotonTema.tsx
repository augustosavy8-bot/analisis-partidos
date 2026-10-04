"use client";

import { useSyncExternalStore } from "react";
import { aplicarTema } from "@/lib/tema-nocturno";

/**
 * Interruptor de modo nocturno (luna / sol). Cambia toda la app al instante.
 * `estilo` reemplaza el estilo de base (por ejemplo, los botones redondos del header de Mis tarjetas).
 */
export function BotonTema({ className = "", estilo }: { className?: string; estilo?: string }) {
  // El tema lo sabe el navegador (data-tema en <html>), no el servidor: se lee de ahí
  // y se escucha el cambio (así todos los botones de la página quedan sincronizados).
  const oscuro = useSyncExternalStore(suscribir, () => document.documentElement.dataset.tema === "oscuro", () => false);

  return (
    <button
      type="button"
      onClick={() => aplicarTema(!oscuro)}
      aria-label={oscuro ? "Pasar a modo claro" : "Pasar a modo nocturno"}
      aria-pressed={oscuro}
      title={oscuro ? "Modo claro" : "Modo nocturno"}
      className={
        estilo ??
        `inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-pt-ink ring-1 ring-inset ring-pt-border transition-colors duration-150 hover:bg-pt-surface ${className}`
      }
    >
      {oscuro ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" />
        </svg>
      )}
    </button>
  );
}

function suscribir(avisar: () => void) {
  const obs = new MutationObserver(avisar);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });
  return () => obs.disconnect();
}
