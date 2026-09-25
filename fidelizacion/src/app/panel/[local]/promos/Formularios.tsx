"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { alternarPromo, borrarPromo, crearPromo, guardarRegalos, type EstadoForm } from "./actions";
import { BotonPrimario, BotonSecundario, inputPanel } from "@/components/Panel";
import { ErrorForm } from "@/components/Campo";
import { DIAS, ORDEN_DIAS, describirPromo, type Promo } from "@/lib/promos";

export function FormRegalos({ slug, bienvenida, cumple }: { slug: string; bienvenida: number; cumple: number }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(guardarRegalos.bind(null, slug), {});
  return (
    <form action={accion} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-stone-600">👋 Puntos de bienvenida</span>
          <input name="puntos_bienvenida" type="number" inputMode="numeric" min={0} max={50} defaultValue={bienvenida} className={inputPanel} />
          <span className="mt-1 block text-xs text-stone-500">Se suman en la primera visita, además del punto normal. 0 = sin regalo.</span>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-stone-600">🎂 Puntos de regalo de cumple</span>
          <input name="puntos_cumple" type="number" inputMode="numeric" min={0} max={50} defaultValue={cumple} className={inputPanel} />
          <span className="mt-1 block text-xs text-stone-500">
            En la primera visita desde el día del cumple hasta 6 días después. Una vez por año. 0 = sin regalo.
          </span>
        </label>
      </div>
      <ErrorForm mensaje={estado.error} />
      <div className="flex items-center gap-3">
        <BotonPrimario type="submit" disabled={pendiente}>
          {pendiente ? "Guardando…" : "Guardar regalos"}
        </BotonPrimario>
        {estado.ok && !pendiente && <span className="text-sm text-emerald-700">Guardado ✓</span>}
      </div>
      <p className="text-xs text-stone-500">
        Para evitar trampas, el regalo de cumple vale si el cliente cargó su cumple al menos 30 días antes, y el cumple
        no se puede cambiar después de cargado.
      </p>
    </form>
  );
}

export function FormPromo({ slug }: { slug: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(crearPromo.bind(null, slug), {});
  const [todoElDia, setTodoElDia] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) form.current?.reset();
  }, [estado.ok]);

  return (
    <form ref={form} action={accion} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="text-xs font-medium text-stone-600">Nombre</span>
          <input name="nombre" required maxLength={40} placeholder="Ej: Happy hour, Martes de amigos" className={inputPanel} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-stone-600">Cada visita suma</span>
          <select name="puntos" defaultValue="2" className={inputPanel}>
            <option value="2">x2 (puntos dobles)</option>
            <option value="3">x3 (puntos triples)</option>
          </select>
        </label>
      </div>
      <fieldset>
        <legend className="text-xs font-medium text-stone-600">Días</legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {ORDEN_DIAS.map((d) => (
            <label key={d} className="cursor-pointer">
              <input type="checkbox" name="dias" value={d} className="peer sr-only" />
              <span className="block rounded-full px-3.5 py-2 text-sm ring-1 ring-stone-300 peer-checked:bg-stone-900 peer-checked:text-white peer-checked:ring-stone-900 peer-focus-visible:ring-2">
                {DIAS[d]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex items-center gap-2 pb-2 text-sm text-stone-700">
          <input type="checkbox" name="todo_el_dia" checked={todoElDia} onChange={(e) => setTodoElDia(e.target.checked)} className="h-4 w-4 accent-stone-900" />
          Todo el día
        </label>
        {!todoElDia && (
          <>
            <label className="block">
              <span className="text-xs font-medium text-stone-600">Desde</span>
              <input name="desde" type="time" required defaultValue="15:00" className={inputPanel} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-stone-600">Hasta</span>
              <input name="hasta" type="time" required defaultValue="18:00" className={inputPanel} />
            </label>
          </>
        )}
      </div>
      <ErrorForm mensaje={estado.error} />
      <BotonPrimario type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Crear promo"}
      </BotonPrimario>
    </form>
  );
}

export function FilaPromo({ slug, promo }: { slug: string; promo: Promo }) {
  const [pendiente, start] = useTransition();
  return (
    <li className={`flex flex-wrap items-center gap-3 px-4 py-3 ${promo.activa ? "" : "opacity-60"}`}>
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {promo.nombre}
          {!promo.activa && <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">pausada</span>}
        </p>
        <p className="text-sm text-stone-500">{describirPromo(promo)}</p>
      </div>
      <div className="flex gap-2">
        <BotonSecundario disabled={pendiente} onClick={() => start(() => alternarPromo(slug, promo.id, !promo.activa))}>
          {promo.activa ? "Pausar" : "Activar"}
        </BotonSecundario>
        <BotonSecundario
          disabled={pendiente}
          onClick={() => confirm(`¿Borrar la promo “${promo.nombre}”?`) && start(() => borrarPromo(slug, promo.id))}
        >
          Borrar
        </BotonSecundario>
      </div>
    </li>
  );
}
