"use client";

import { useActionState } from "react";
import { guardarCumple, type EstadoCumple } from "./actions";
import { SelectorCumple } from "@/components/SelectorCumple";

export function FormCumple({ slug, puntos }: { slug: string; puntos: number }) {
  const [estado, accion, pendiente] = useActionState<EstadoCumple, FormData>(guardarCumple.bind(null, slug), {});
  if (estado.ok) return null;
  return (
    <form action={accion} className="mt-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200/70">
      <p className="font-medium text-stone-900">🎂 ¿Cuándo es tu cumple?</p>
      <p className="mt-1 text-sm text-stone-600">
        La semana de tu cumple te regalamos {puntos} puntos en tu visita. Se carga una sola vez.
      </p>
      <div className="mt-3">
        <SelectorCumple requerido />
      </div>
      {estado.error && <p className="mt-2 text-sm text-red-700">{estado.error}</p>}
      <button
        disabled={pendiente}
        className="mt-3 w-full rounded-xl px-4 py-3 font-semibold shadow-sm disabled:opacity-60"
        style={{ background: "var(--marca)", color: "var(--marca-texto)" }}
      >
        {pendiente ? "Un segundo…" : "Guardar mi cumple"}
      </button>
    </form>
  );
}
