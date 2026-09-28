"use client";

import { useTransition } from "react";
import { eliminarCliente } from "./actions";
import { confirmar } from "@/components/app/Dialogos";
import { avisar } from "@/components/app/Toasts";
import { claseBoton } from "@/components/app/Boton";
import { Icono } from "@/components/Icono";

export function BotonEliminar({ slug, clienteId, nombre }: { slug: string; clienteId: string; nombre: string }) {
  const [pendiente, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={async () => {
        const ok = await confirmar({
          titulo: `¿Eliminar a ${nombre}?`,
          texto: "Se borran su tarjeta, sus puntos y su historial en este local. No se puede deshacer.",
          confirmar: "Eliminar",
          peligro: true,
        });
        if (!ok) return;
        start(async () => {
          const r = await eliminarCliente(slug, clienteId);
          avisar(r.error ?? `${nombre} fue eliminado`, r.error ? "error" : "ok");
        });
      }}
      className={claseBoton("fantasma", "sm", "!px-2.5 !text-pt-error-ink hover:!bg-pt-error-soft")}
      aria-label={`Eliminar a ${nombre}`}
      title="Eliminar"
    >
      {pendiente ? "…" : <Icono nombre="borrar" tamaño={18} />}
    </button>
  );
}
