"use client";

import { useEffect, useState } from "react";

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
    <div className="anim-subir fixed inset-x-3 bottom-3 z-40 rounded-2xl bg-stone-900 p-4 text-white shadow-2xl" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
      <div className="flex items-start gap-3">
        <div className="text-2xl" aria-hidden>📌</div>
        <div className="flex-1 text-sm">
          <p className="font-semibold">Tené tu tarjeta a mano</p>
          {modo === "ios" ? (
            <p className="mt-1 text-stone-300">
              Tocá <span className="inline-block rounded bg-white/15 px-1.5">Compartir ⬆︎</span> y después{" "}
              <strong>“Agregar a inicio”</strong>.
            </p>
          ) : (
            <p className="mt-1 text-stone-300">Instalala en tu pantalla de inicio, como una app.</p>
          )}
        </div>
        <button onClick={cerrar} className="text-stone-400" aria-label="Cerrar">
          ✕
        </button>
      </div>
      {modo === "android" && evento && (
        <button
          onClick={async () => {
            await evento.prompt();
            cerrar();
          }}
          className="mt-3 w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-stone-900"
        >
          Instalar
        </button>
      )}
    </div>
  );
}
