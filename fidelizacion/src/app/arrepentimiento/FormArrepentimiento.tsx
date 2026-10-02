"use client";

import { useActionState } from "react";
import { pedirArrepentimiento, type EstadoArrepentimiento } from "./actions";

const campo = "w-full rounded-lg border border-stone-300 px-3 py-2";

export function FormArrepentimiento() {
  const [estado, enviar, pendiente] = useActionState<EstadoArrepentimiento, FormData>(pedirArrepentimiento, {});
  if (estado.codigo) {
    return (
      <div className="mt-8 rounded-xl bg-emerald-50 p-5 text-emerald-900">
        <p className="font-semibold">Recibimos tu pedido.</p>
        <p className="mt-1">
          Tu código de trámite es <strong className="font-mono text-lg">{estado.codigo}</strong>. Guardalo: te escribimos al email que pusiste
          para coordinar la devolución.
        </p>
      </div>
    );
  }
  return (
    <form action={enviar} className="mt-8 grid gap-4">
      <label className="grid gap-1 text-sm">
        Nombre o comercio
        <input name="nombre" required autoComplete="name" className={campo} />
      </label>
      <label className="grid gap-1 text-sm">
        Email
        <input name="email" type="email" required autoComplete="email" className={campo} />
      </label>
      <fieldset className="grid gap-2 text-sm">
        <legend className="mb-1">¿Qué querés revocar?</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="tipo" value="suscripcion" defaultChecked /> La suscripción a Point
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="tipo" value="pedido" /> Una compra de llaveros o chips
        </label>
      </fieldset>
      <label className="grid gap-1 text-sm">
        Número de pedido (opcional)
        <input name="referencia" placeholder="Por ejemplo, #1001" className={campo} />
      </label>
      <label className="grid gap-1 text-sm">
        Comentario (opcional)
        <textarea name="motivo" rows={3} maxLength={500} className={campo} />
      </label>
      <input type="text" name="sitio" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {estado.error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{estado.error}</p>}
      <button disabled={pendiente} className="rounded-lg bg-stone-900 px-4 py-3 font-semibold text-white disabled:opacity-50">
        {pendiente ? "Enviando…" : "Revocar la compra"}
      </button>
    </form>
  );
}
