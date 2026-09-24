"use client";

import { useActionState, useEffect, useRef } from "react";
import { guardarPremio, type EstadoPremio } from "./actions";
import { BotonPrimario, inputPanel } from "@/components/Panel";
import { ErrorForm } from "@/components/Campo";

type Premio = { id: string; nombre: string; descripcion: string | null; puntos_necesarios: number };

export function FormPremio({ slug, premio, alGuardar }: { slug: string; premio?: Premio; alGuardar?: () => void }) {
  const [estado, accion, pendiente] = useActionState<EstadoPremio, FormData>(
    guardarPremio.bind(null, slug, premio?.id ?? null),
    {},
  );
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) {
      if (!premio) form.current?.reset();
      alGuardar?.();
    }
  }, [estado.ok, premio, alGuardar]);

  return (
    <form ref={form} action={accion} className="grid gap-3 sm:grid-cols-[1fr_120px_auto] sm:items-end">
      <label className="block">
        <span className="text-xs font-medium text-stone-600">Premio</span>
        <input name="nombre" required maxLength={60} defaultValue={premio?.nombre} placeholder="Ej: Café gratis" className={inputPanel} />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-stone-600">Puntos</span>
        <input name="puntos" type="number" inputMode="numeric" min={1} max={1000} required defaultValue={premio?.puntos_necesarios} placeholder="10" className={inputPanel} />
      </label>
      <BotonPrimario type="submit" disabled={pendiente} className="h-[38px]">
        {pendiente ? "Guardando…" : premio ? "Guardar" : "Agregar"}
      </BotonPrimario>
      <label className="block sm:col-span-3">
        <span className="text-xs font-medium text-stone-600">Descripción (opcional)</span>
        <input name="descripcion" maxLength={140} defaultValue={premio?.descripcion ?? ""} placeholder="Ej: Cualquier café de la carta" className={inputPanel} />
      </label>
      {estado.error && (
        <div className="sm:col-span-3">
          <ErrorForm mensaje={estado.error} />
        </div>
      )}
    </form>
  );
}
