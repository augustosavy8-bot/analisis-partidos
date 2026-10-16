"use client";

import { useTransition } from "react";
import { cambiarSocio } from "./actions";
import { confirmar } from "@/components/app/Dialogos";
import { avisar } from "@/components/app/Toasts";
import { claseBoton } from "@/components/app/Boton";
import { Icono } from "@/components/Icono";

/** Hacer socio o quitar del club a mano (para corregir: lo normal es el toque del llavero de socios). */
export function BotonSocio({ slug, clienteId, nombre, socio, club }: { slug: string; clienteId: string; nombre: string; socio: boolean; club: string }) {
  const [pendiente, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={async () => {
        const ok = await confirmar(
          socio
            ? { titulo: `¿Quitar a ${nombre} del club?`, texto: "Su tarjeta vuelve a ser la común. Sus puntos no cambian.", confirmar: "Quitar del club" }
            : { titulo: `¿Hacer socio a ${nombre}?`, texto: `Su tarjeta pasa a ser la de ${club}. También se hace solo al tocar con el llavero de socios.`, confirmar: "Hacer socio" },
        );
        if (!ok) return;
        start(async () => {
          const r = await cambiarSocio(slug, clienteId, !socio);
          avisar(r.error ?? (socio ? `${nombre} ya no es socio` : `${nombre} ahora es socio`), r.error ? "error" : "ok");
        });
      }}
      className={claseBoton("fantasma", "sm", `!px-2.5 ${socio ? "!text-pt-accent-ink" : "!text-pt-ink-3 hover:!text-pt-ink"}`)}
      aria-label={socio ? `Quitar a ${nombre} del club` : `Hacer socio a ${nombre}`}
      aria-pressed={socio}
      title={socio ? "Socio · quitar del club" : "Hacer socio"}
    >
      {pendiente ? "…" : <Icono nombre="socio" tamaño={18} className={socio ? "fill-current" : ""} />}
    </button>
  );
}
