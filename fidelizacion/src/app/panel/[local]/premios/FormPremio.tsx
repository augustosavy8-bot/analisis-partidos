"use client";

import { useActionState, useEffect, useRef } from "react";
import { guardarPremio, type EstadoPremio } from "./actions";
import { BotonPrimario, EtiquetaPanel, inputPanel } from "@/components/Panel";
import { avisar } from "@/components/app/Toasts";
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
      avisar(premio ? "Premio guardado" : "Premio agregado");
      alGuardar?.();
    }
  }, [estado.ok, premio, alGuardar]);

  return (
    <form ref={form} action={accion} className="grid gap-3 sm:grid-cols-[1fr_120px_auto] sm:items-end">
      <label className="block">
        <EtiquetaPanel>Premio</EtiquetaPanel>
        <input name="nombre" required maxLength={60} defaultValue={premio?.nombre} placeholder="Ej: Café gratis" className={inputPanel} />
      </label>
      <label className="block">
        <EtiquetaPanel>Puntos</EtiquetaPanel>
        <input name="puntos" type="number" inputMode="numeric" min={1} max={1000} required defaultValue={premio?.puntos_necesarios} placeholder="10" className={inputPanel} />
      </label>
      <BotonPrimario type="submit" disabled={pendiente} >
        {pendiente ? "Guardando…" : premio ? "Guardar" : "Agregar"}
      </BotonPrimario>
      <label className="block sm:col-span-3">
        <EtiquetaPanel>Descripción (opcional)</EtiquetaPanel>
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
