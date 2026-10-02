"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { alternarPromo, borrarPromo, crearPromo, guardarRegalos, type EstadoForm } from "./actions";
import { BotonPrimario, BotonSecundario, EtiquetaPanel, inputPanel } from "@/components/Panel";
import { claseBoton } from "@/components/app/Boton";
import { claseCheckbox } from "@/components/app/Campos";
import { Insignia } from "@/components/app/Superficie";
import { confirmar } from "@/components/app/Dialogos";
import { avisar } from "@/components/app/Toasts";
import { ErrorForm } from "@/components/Campo";
import { DIAS, ORDEN_DIAS, describirPromo, type Promo } from "@/lib/promos";

export function FormRegalos({ slug, bienvenida, cumple }: { slug: string; bienvenida: number; cumple: number }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(guardarRegalos.bind(null, slug), {});
  useEffect(() => {
    if (estado.ok) avisar("Regalos guardados");
  }, [estado.ok]);
  return (
    <form action={accion} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <EtiquetaPanel>Puntos de bienvenida</EtiquetaPanel>
          <input name="puntos_bienvenida" type="number" inputMode="numeric" min={0} max={50} defaultValue={bienvenida} className={inputPanel} />
          <span className="mt-1.5 block pt-app-detalle text-pt-ink-2">Se suman en la primera visita, además del punto normal. 0 = sin regalo.</span>
        </label>
        <label className="block">
          <EtiquetaPanel>Puntos de regalo de cumple</EtiquetaPanel>
          <input name="puntos_cumple" type="number" inputMode="numeric" min={0} max={50} defaultValue={cumple} className={inputPanel} />
          <span className="mt-1.5 block pt-app-detalle text-pt-ink-2">
            En la primera visita desde el día del cumple hasta 6 días después. Una vez por año. 0 = sin regalo.
          </span>
        </label>
      </div>
      <ErrorForm mensaje={estado.error} />
      <BotonPrimario type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Guardar regalos"}
      </BotonPrimario>
      <p className="pt-app-detalle text-pt-ink-2">
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
    if (!estado.ok) return;
    form.current?.reset();
    avisar("Promo creada");
  }, [estado.ok]);

  return (
    <form ref={form} action={accion} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <EtiquetaPanel>Nombre</EtiquetaPanel>
          <input name="nombre" required maxLength={40} placeholder="Ej: Happy hour, Martes de amigos" className={inputPanel} />
        </label>
        <label className="block">
          <EtiquetaPanel>Cada visita suma</EtiquetaPanel>
          <select name="puntos" defaultValue="2" className={inputPanel}>
            <option value="2">x2 (puntos dobles)</option>
            <option value="3">x3 (puntos triples)</option>
          </select>
        </label>
      </div>
      <fieldset>
        <legend className="text-[13px] font-medium text-pt-ink">Días</legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {ORDEN_DIAS.map((d) => (
            <label key={d} className="cursor-pointer">
              <input type="checkbox" name="dias" value={d} className="peer sr-only" />
              <span className="flex h-pt-control-sm items-center rounded-full bg-pt-pure px-3.5 text-[13px] font-semibold text-pt-ink-2 ring-1 ring-inset ring-pt-border transition-colors duration-150 hover:text-pt-ink peer-checked:bg-pt-ink peer-checked:text-white peer-checked:ring-pt-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-pt-accent-dark">
                {DIAS[d]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex h-pt-control-sm items-center gap-2 text-[14px] text-pt-ink">
          <input type="checkbox" name="todo_el_dia" checked={todoElDia} onChange={(e) => setTodoElDia(e.target.checked)} className={claseCheckbox} />
          Todo el día
        </label>
        {!todoElDia && (
          <>
            <label className="block">
              <EtiquetaPanel>Desde</EtiquetaPanel>
              <input name="desde" type="time" required defaultValue="15:00" className={inputPanel} />
            </label>
            <label className="block">
              <EtiquetaPanel>Hasta</EtiquetaPanel>
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
    <li className={`flex flex-wrap items-center gap-3 px-4 py-3 ${promo.activa ? "" : "opacity-70"}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pt-sm bg-pt-ink font-[family-name:var(--font-pt-display)] text-sm font-bold text-pt-accent" aria-hidden>
        x{promo.puntos}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[15px] font-medium text-pt-ink">
          {promo.nombre}
          {!promo.activa && <Insignia>pausada</Insignia>}
        </p>
        <p className="pt-app-detalle text-pt-ink-2">{describirPromo(promo)}</p>
      </div>
      <div className="flex w-full justify-end gap-2 sm:w-auto">
        <BotonSecundario disabled={pendiente} onClick={() => start(async () => {
              const r = await alternarPromo(slug, promo.id, !promo.activa);
              if (r.error) avisar(r.error, "error");
            })}>
          {promo.activa ? "Pausar" : "Activar"}
        </BotonSecundario>
        <button
          type="button"
          disabled={pendiente}
          className={claseBoton("peligro", "sm")}
          onClick={async () => {
            if (await confirmar({ titulo: `¿Borrar la promo “${promo.nombre}”?`, confirmar: "Borrar", peligro: true })) {
              start(() => borrarPromo(slug, promo.id).then(() => avisar("Promo borrada")));
            }
          }}
        >
          Borrar
        </button>
      </div>
    </li>
  );
}
