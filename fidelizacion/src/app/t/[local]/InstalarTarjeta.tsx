"use client";

import { useEffect, useState } from "react";
import { Icono } from "@/components/Icono";
import { claseBoton } from "@/components/app/Boton";

type EventoInstalar = Event & { prompt: () => Promise<void> };
const CLAVE = "fid_instalar_cerrado";

/** Sugerencia para agregar la tarjeta a la pantalla de inicio (iOS y Android). */
export function InstalarTarjeta() {
  const [modo, setModo] = useState<"ios" | "android" | null>(null);
  const [evento, setEvento] = useState<EventoInstalar | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let cerrado = false;
    try {
      cerrado = localStorage.getItem(CLAVE) === "1";
    } catch {}
    if (standalone || cerrado) return;

    const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (esIOS) {
      const t = setTimeout(() => setModo("ios"), 1500);
      return () => clearTimeout(t);
    }
    const alInstalar = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
      setModo("android");
    };
    window.addEventListener("beforeinstallprompt", alInstalar);
    return () => window.removeEventListener("beforeinstallprompt", alInstalar);
  }, []);

  if (!modo) return null;

  const cerrar = () => {
    setModo(null);
    try {
      localStorage.setItem(CLAVE, "1");
    } catch {}
  };

  return (
    <div
      role="dialog"
      aria-label="Tené tu tarjeta a mano"
      className="pt-subir fixed inset-x-3 z-30 mx-auto max-w-md rounded-pt-card bg-pt-ink p-4 text-white shadow-pt-flotante bottom-[calc(var(--spacing-pt-tabbar)+env(safe-area-inset-bottom)+0.75rem)]"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pt-accent text-pt-ink" aria-hidden>
          <Icono nombre="tarjeta" tamaño={18} />
        </span>
        <div className="flex-1 pt-app-detalle">
          <p className="text-[15px] font-semibold">Tené tu tarjeta a mano</p>
          {modo === "ios" ? (
            <p className="mt-0.5 text-white/75">
              Tocá <span className="inline-block rounded bg-white/15 px-1.5">Compartir ⬆︎</span> y después <strong className="text-white">“Agregar a inicio”</strong>.
            </p>
          ) : (
            <p className="mt-0.5 text-white/75">Instalala en tu pantalla de inicio, como una app.</p>
          )}
        </div>
        <button onClick={cerrar} className="-m-1 rounded-full p-1.5 text-white/70 transition-colors duration-150 hover:bg-white/10 hover:text-white" aria-label="Cerrar">
          <Icono nombre="cerrar" tamaño={18} />
        </button>
      </div>
      {modo === "android" && evento && (
        <button
          onClick={async () => {
            await evento.prompt();
            cerrar();
          }}
          className={claseBoton("acento", "md", "mt-3 w-full")}
        >
          Instalar
        </button>
      )}
    </div>
  );
}
