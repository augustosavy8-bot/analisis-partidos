"use client";

import { useState, useTransition } from "react";
import { alternarPremio, borrarPremio } from "./actions";
import { FormPremio } from "./FormPremio";
import { BotonSecundario } from "@/components/Panel";
import { claseBoton } from "@/components/app/Boton";
import { Insignia } from "@/components/app/Superficie";
import { confirmar } from "@/components/app/Dialogos";
import { avisar } from "@/components/app/Toasts";

type Premio = { id: string; nombre: string; descripcion: string | null; puntos_necesarios: number; activo: boolean; canjes: number };

export function FilaPremio({ slug, premio }: { slug: string; premio: Premio }) {
  const [editando, setEditando] = useState(false);
  const [pendiente, start] = useTransition();

  if (editando) {
    return (
      <li className="px-4 py-4">
        <FormPremio slug={slug} premio={premio} alGuardar={() => setEditando(false)} />
        <button onClick={() => setEditando(false)} className={claseBoton("fantasma", "sm", "mt-2")}>
          Cancelar
        </button>
      </li>
    );
  }

  return (
    <li className={`flex flex-wrap items-center gap-3 px-4 py-3 ${premio.activo ? "" : "opacity-70"}`}>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[15px] font-medium text-pt-ink">
          {premio.nombre}
          {!premio.activo && <Insignia>oculto</Insignia>}
        </p>
        <p className="pt-app-detalle text-pt-ink-2">
          {premio.puntos_necesarios} puntos
          {premio.descripcion && ` · ${premio.descripcion}`}
          {premio.canjes > 0 && ` · canjeado ${premio.canjes} ${premio.canjes === 1 ? "vez" : "veces"}`}
        </p>
      </div>
      <div className="flex w-full justify-end gap-2 sm:w-auto">
        <BotonSecundario onClick={() => setEditando(true)}>Editar</BotonSecundario>
        <BotonSecundario disabled={pendiente} onClick={() => start(() => alternarPremio(slug, premio.id, !premio.activo))}>
          {premio.activo ? "Ocultar" : "Mostrar"}
        </BotonSecundario>
        <button
          type="button"
          disabled={pendiente}
          className={claseBoton("peligro", "sm")}
          onClick={async () => {
            const ok = await confirmar(
              premio.canjes > 0
                ? { titulo: "Este premio ya se canjeó", texto: "Se va a ocultar para no perder el historial.", confirmar: "Ocultar" }
                : { titulo: `¿Borrar “${premio.nombre}”?`, texto: "Deja de aparecer en la tarjeta de tus clientes.", confirmar: "Borrar", peligro: true },
            );
            if (ok) start(() => borrarPremio(slug, premio.id).then(() => avisar(premio.canjes > 0 ? "Premio ocultado" : "Premio borrado")));
          }}
        >
          Borrar
        </button>
      </div>
    </li>
  );
}
