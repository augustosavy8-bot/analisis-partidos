"use client";

import { useActionState, useState, useTransition } from "react";
import type { EstadoAdmin } from "./actions";

/** Formulario del admin con el resultado (ok / error) debajo. */
export function FormAdmin({
  accion,
  children,
  boton = "Guardar",
  className = "",
}: {
  accion: (prev: EstadoAdmin, form: FormData) => Promise<EstadoAdmin>;
  children: React.ReactNode;
  boton?: string;
  className?: string;
}) {
  const [estado, enviar, pendiente] = useActionState(accion, {});
  return (
    <form action={enviar} className={`grid gap-3 ${className}`}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pendiente} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pendiente ? "Un segundo…" : boton}
        </button>
        <Resultado estado={estado} />
      </div>
    </form>
  );
}

/** Botón que ejecuta una acción (con confirmación opcional) y muestra el resultado. */
export function BotonAccion({
  accion,
  children,
  confirmar,
  peligro,
}: {
  accion: () => Promise<EstadoAdmin>;
  children: React.ReactNode;
  confirmar?: string;
  peligro?: boolean;
}) {
  const [estado, setEstado] = useState<EstadoAdmin>({});
  const [pendiente, iniciar] = useTransition();
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pendiente}
        onClick={() => {
          if (confirmar && !window.confirm(confirmar)) return;
          iniciar(async () => setEstado(await accion()));
        }}
        className={`rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50 ${peligro ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-stone-100 text-stone-800 hover:bg-stone-200"}`}
      >
        {pendiente ? "…" : children}
      </button>
      <Resultado estado={estado} />
    </span>
  );
}

function Resultado({ estado }: { estado: EstadoAdmin }) {
  if (estado.error) return <span className="text-sm text-red-700">{estado.error}</span>;
  if (estado.ok) return <span className="text-sm text-emerald-700">{estado.ok}</span>;
  return null;
}

export const claseCampo = "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm";
