"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { alternarMozo, cambiarPin, crearMozo, type EstadoMozo } from "./actions";
import { BotonPrimario, BotonSecundario, inputPanel } from "@/components/Panel";
import { ErrorForm } from "@/components/Campo";

const inputPin = `${inputPanel} font-mono tracking-widest`;

export function FormNuevoMozo({ slug }: { slug: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoMozo, FormData>(crearMozo.bind(null, slug), {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) form.current?.reset();
  }, [estado.ok]);
  return (
    <form ref={form} action={accion} className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
      <label className="block">
        <span className="text-xs font-medium text-stone-600">Nombre</span>
        <input name="nombre" required maxLength={40} placeholder="Ej: Caro" className={inputPanel} />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-stone-600">PIN (4 a 6 números)</span>
        <input name="pin" required inputMode="numeric" pattern="\d{4,6}" maxLength={6} placeholder="••••" className={inputPin} />
      </label>
      <BotonPrimario type="submit" disabled={pendiente} className="h-[38px]">
        {pendiente ? "Creando…" : "Agregar"}
      </BotonPrimario>
      {estado.error && (
        <div className="sm:col-span-3">
          <ErrorForm mensaje={estado.error} />
        </div>
      )}
    </form>
  );
}

export function AccionesMozo({ slug, id, activo }: { slug: string; id: string; activo: boolean }) {
  const [cambiando, setCambiando] = useState(false);
  const [pendiente, start] = useTransition();
  const [estado, accion, guardando] = useActionState<EstadoMozo, FormData>(cambiarPin.bind(null, slug, id), {});
  const [okVisto, setOkVisto] = useState<number | undefined>();
  if (estado.ok && estado.ok !== okVisto && cambiando) {
    setOkVisto(estado.ok);
    setCambiando(false);
  }

  if (cambiando) {
    return (
      <form action={accion} className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <input name="pin" required inputMode="numeric" pattern="\d{4,6}" maxLength={6} placeholder="Nuevo PIN" className={`${inputPin} w-32`} autoFocus />
        <BotonPrimario type="submit" disabled={guardando}>Guardar</BotonPrimario>
        <button type="button" onClick={() => setCambiando(false)} className="text-sm text-stone-500 underline">
          Cancelar
        </button>
        {estado.error && <p className="w-full text-sm text-red-700">{estado.error}</p>}
      </form>
    );
  }

  return (
    <div className="flex gap-2">
      {estado.ok && <span className="self-center text-sm text-emerald-700">PIN actualizado ✓</span>}
      <BotonSecundario onClick={() => setCambiando(true)}>Cambiar PIN</BotonSecundario>
      <BotonSecundario disabled={pendiente} onClick={() => start(() => alternarMozo(slug, id, !activo))}>
        {activo ? "Desactivar" : "Activar"}
      </BotonSecundario>
    </div>
  );
}
