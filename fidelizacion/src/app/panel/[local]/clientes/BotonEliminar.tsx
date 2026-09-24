"use client";

import { useTransition } from "react";
import { eliminarCliente } from "./actions";

export function BotonEliminar({ slug, clienteId, nombre }: { slug: string; clienteId: string; nombre: string }) {
  const [pendiente, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={() => {
        if (
          confirm(
            `¿Eliminar a ${nombre}?\n\nSe borran su tarjeta, sus puntos y su historial en este local. No se puede deshacer.`,
          )
        ) {
          start(async () => {
            const r = await eliminarCliente(slug, clienteId);
            if (r.error) alert(r.error);
          });
        }
      }}
      className="rounded-lg px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      aria-label={`Eliminar a ${nombre}`}
    >
      {pendiente ? "Eliminando…" : "Eliminar"}
    </button>
  );
}
