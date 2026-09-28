"use client";

import { useEffect, useState } from "react";
import { Icono } from "@/components/Icono";

type Toast = { id: number; texto: string; tono: "ok" | "error" };
const EVENTO = "pt-toast";

/** Muestra un toast desde cualquier componente cliente: avisar("Guardado"). */
export function avisar(texto: string, tono: Toast["tono"] = "ok") {
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: { texto, tono } }));
}

/** Contenedor de toasts (uno por layout). Arriba de la tab bar en celu. */
export function Toasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let id = 0;
    const alAvisar = (e: Event) => {
      const { texto, tono } = (e as CustomEvent<Omit<Toast, "id">>).detail;
      const nuevo = { id: ++id, texto, tono };
      setToasts((t) => [...t.slice(-2), nuevo]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== nuevo.id)), 3200);
    };
    window.addEventListener(EVENTO, alAvisar);
    return () => window.removeEventListener(EVENTO, alAvisar);
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 bottom-[calc(var(--spacing-pt-tabbar)+env(safe-area-inset-bottom)+0.75rem)] md:bottom-6"
    >
      {toasts.map((t) => (
        <p
          key={t.id}
          role={t.tono === "error" ? "alert" : "status"}
          className="pt-subir pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-full bg-pt-ink py-2.5 pl-3 pr-4 pt-app-detalle font-medium text-white shadow-pt-flotante"
        >
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${t.tono === "ok" ? "bg-pt-accent text-pt-ink" : "bg-pt-error text-white"}`} aria-hidden>
            {t.tono === "ok" ? <Icono nombre="check" tamaño={13} /> : "!"}
          </span>
          {t.texto}
        </p>
      ))}
    </div>
  );
}
