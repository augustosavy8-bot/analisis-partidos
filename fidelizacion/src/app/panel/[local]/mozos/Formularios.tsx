"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { alternarMozo, cambiarPin, crearMozo, type EstadoMozo } from "./actions";
import { BotonPrimario, BotonSecundario, EtiquetaPanel, inputPanel } from "@/components/Panel";
import { claseBoton } from "@/components/app/Boton";
import { avisar } from "@/components/app/Toasts";
import { ErrorForm } from "@/components/Campo";

const inputPin = `${inputPanel} font-mono tracking-widest`;

export function FormNuevoMozo({ slug }: { slug: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoMozo, FormData>(crearMozo.bind(null, slug), {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!estado.ok) return;
    form.current?.reset();
    avisar("Listo, ya puede sumar puntos");
  }, [estado.ok]);
  return (
    <form ref={form} action={accion} className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
      <label className="block">
        <EtiquetaPanel>Nombre</EtiquetaPanel>
        <input name="nombre" required maxLength={40} placeholder="Ej: Caro" className={inputPanel} />
      </label>
      <label className="block">
        <EtiquetaPanel>PIN (6 números)</EtiquetaPanel>
        <input name="pin" required inputMode="numeric" pattern="\d{6}" maxLength={6} placeholder="••••••" className={inputPin} />
      </label>
      <BotonPrimario type="submit" disabled={pendiente}>
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
  useEffect(() => {
    if (okVisto) avisar("PIN actualizado");
  }, [okVisto]);

  if (cambiando) {
    return (
      <form action={accion} className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <input name="pin" required inputMode="numeric" pattern="\d{6}" maxLength={6} placeholder="Nuevo PIN" className={`${inputPin} w-32`} autoFocus />
        <BotonPrimario type="submit" disabled={guardando}>Guardar</BotonPrimario>
        <button type="button" onClick={() => setCambiando(false)} className={claseBoton("fantasma", "sm")}>
          Cancelar
        </button>
        {estado.error && <p className="w-full pt-app-detalle text-pt-error-ink">{estado.error}</p>}
      </form>
    );
  }

  return (
    <div className="flex w-full justify-end gap-2 sm:w-auto">
      <BotonSecundario onClick={() => setCambiando(true)}>Cambiar PIN</BotonSecundario>
      <BotonSecundario disabled={pendiente} onClick={() => start(() => alternarMozo(slug, id, !activo))}>
        {activo ? "Desactivar" : "Activar"}
      </BotonSecundario>
    </div>
  );
}
