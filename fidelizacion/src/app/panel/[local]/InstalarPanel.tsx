"use client";

import { useEffect, useState } from "react";
import { Icono } from "@/components/Icono";

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * "Instalar app": aparece sólo cuando el navegador ofrece instalar el panel
 * (Chrome y Edge, en la compu o en Android) y no está ya instalado.
 */
export function InstalarPanel() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    const alOfrecer = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
    };
    const alInstalar = () => setEvento(null);
    window.addEventListener("beforeinstallprompt", alOfrecer);
    window.addEventListener("appinstalled", alInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", alOfrecer);
      window.removeEventListener("appinstalled", alInstalar);
    };
  }, []);

  if (!evento) return null;

  return (
    <button
      onClick={async () => {
        await evento.prompt();
        const { outcome } = await evento.userChoice;
        if (outcome === "accepted") setEvento(null);
      }}
      className="flex h-pt-control-sm items-center gap-1.5 rounded-full bg-pt-ink px-3 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-90"
    >
      <Icono nombre="descargar" tamaño={16} /> Instalar app
    </button>
  );
}
