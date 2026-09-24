"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { crearLocal, type EstadoLocal } from "../../actions";
import { BotonPrimario, Tarjeta, inputPanel } from "@/components/Panel";
import { ErrorForm } from "@/components/Campo";
import { Credenciales } from "@/components/Credenciales";

function slugDesde(nombre: string) {
  return nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

export function FormNuevoLocal({ appUrl }: { appUrl: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoLocal, FormData>(crearLocal, {});
  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTocado, setSlugTocado] = useState(false);
  const slugFinal = slugTocado ? slug : slugDesde(nombre);

  if (estado.creado) {
    const c = estado.creado;
    return (
      <Tarjeta className="space-y-4">
        <p className="text-lg font-semibold">✓ Local “{c.nombre}” creado</p>
        {c.email && c.password && <Credenciales email={c.email} password={c.password} url={`${appUrl}/panel`} />}
        {c.email && !c.password && !c.errorDueno && (
          <p className="text-sm text-stone-600">{c.email} ya tenía usuario: se le asignó este local y entra con su contraseña de siempre.</p>
        )}
        {c.errorDueno && <ErrorForm mensaje={`El local se creó, pero no se pudo crear el dueño: ${c.errorDueno}`} />}
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/locales/${c.slug}`} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white">
            Configurar chips y dueños →
          </Link>
          <button type="button" onClick={() => location.reload()} className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium">
            Crear otro
          </button>
        </div>
      </Tarjeta>
    );
  }

  return (
    <form action={accion} className="space-y-4">
      <Tarjeta className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-stone-600">Nombre del local</span>
          <input name="nombre" required maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Barbería Don Pepe" className={inputPanel} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-stone-600">Dirección de la tarjeta</span>
          <div className="flex items-center gap-1">
            <span className="text-sm text-stone-500">/t/</span>
            <input
              name="slug"
              value={slugFinal}
              onChange={(e) => {
                setSlugTocado(true);
                setSlug(slugDesde(e.target.value));
              }}
              className={`${inputPanel} font-mono`}
            />
          </div>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-stone-600">Rubro (opcional)</span>
          <input name="rubro" maxLength={60} placeholder="Ej: Barbería" className={inputPanel} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-stone-600">Horas entre puntos</span>
          <input name="horas" type="number" step={0.25} min={0} max={168} defaultValue={4} className={inputPanel} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-stone-600">Color principal</span>
          <input type="color" name="color_primario" defaultValue="#1f2937" className="h-[38px] w-full cursor-pointer rounded-lg border border-stone-300 bg-white p-1" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-stone-600">Color de acento</span>
          <input type="color" name="color_secundario" defaultValue="#f59e0b" className="h-[38px] w-full cursor-pointer rounded-lg border border-stone-300 bg-white p-1" />
        </label>
      </Tarjeta>
      <Tarjeta>
        <label className="block">
          <span className="text-xs font-medium text-stone-600">Email del dueño (opcional)</span>
          <input name="email" type="email" placeholder="dueno@sulocal.com" className={inputPanel} />
        </label>
        <p className="mt-2 text-xs text-stone-500">Si no tiene usuario, se crea con una contraseña temporal que vas a ver una sola vez.</p>
      </Tarjeta>
      <ErrorForm mensaje={estado.error} />
      <BotonPrimario type="submit" disabled={pendiente}>
        {pendiente ? "Creando…" : "Crear local"}
      </BotonPrimario>
    </form>
  );
}
