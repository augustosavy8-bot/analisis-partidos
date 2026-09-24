"use client";

import { useState, useTransition } from "react";
import { alternarPremio, borrarPremio } from "./actions";
import { FormPremio } from "./FormPremio";
import { BotonSecundario } from "@/components/Panel";

type Premio = { id: string; nombre: string; descripcion: string | null; puntos_necesarios: number; activo: boolean; canjes: number };

export function FilaPremio({ slug, premio }: { slug: string; premio: Premio }) {
  const [editando, setEditando] = useState(false);
  const [pendiente, start] = useTransition();

  if (editando) {
    return (
      <li className="px-4 py-4">
        <FormPremio slug={slug} premio={premio} alGuardar={() => setEditando(false)} />
        <button onClick={() => setEditando(false)} className="mt-2 text-sm text-stone-500 underline">
          Cancelar
        </button>
      </li>
    );
  }

  return (
    <li className={`flex flex-wrap items-center gap-3 px-4 py-3 ${premio.activo ? "" : "opacity-60"}`}>
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {premio.nombre}
          {!premio.activo && <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">oculto</span>}
        </p>
        <p className="text-sm text-stone-500">
          {premio.puntos_necesarios} puntos
          {premio.descripcion && ` · ${premio.descripcion}`}
          {premio.canjes > 0 && ` · canjeado ${premio.canjes} ${premio.canjes === 1 ? "vez" : "veces"}`}
        </p>
      </div>
      <div className="flex gap-2">
        <BotonSecundario onClick={() => setEditando(true)}>Editar</BotonSecundario>
        <BotonSecundario disabled={pendiente} onClick={() => start(() => alternarPremio(slug, premio.id, !premio.activo))}>
          {premio.activo ? "Ocultar" : "Mostrar"}
        </BotonSecundario>
        <BotonSecundario
          disabled={pendiente}
          onClick={() => {
            const msg = premio.canjes > 0
              ? "Este premio ya se canjeó: se va a ocultar para no perder el historial. ¿Seguimos?"
              : `¿Borrar “${premio.nombre}”?`;
            if (confirm(msg)) start(() => borrarPremio(slug, premio.id));
          }}
        >
          Borrar
        </BotonSecundario>
      </div>
    </li>
  );
}
