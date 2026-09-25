"use client";

import { useActionState, useState } from "react";
import { guardarAjustes, type EstadoAjustes } from "./actions";
import { BotonPrimario, Tarjeta, inputPanel } from "@/components/Panel";
import { ErrorForm } from "@/components/Campo";
import { TERMINOS, capitalizar, plural } from "@/lib/terminos";

type Local = {
  slug: string;
  nombre: string;
  rubro: string | null;
  logo_url: string | null;
  color_primario: string;
  color_secundario: string;
  minutos_entre_puntos: number;
  termino_personal: string;
};

function textoSobre(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? "#1c1917" : "#ffffff";
}

export function FormAjustes({ local }: { local: Local }) {
  const [estado, accion, pendiente] = useActionState<EstadoAjustes, FormData>(guardarAjustes.bind(null, local.slug), {});
  const [nombre, setNombre] = useState(local.nombre);
  const [primario, setPrimario] = useState(local.color_primario);
  const [secundario, setSecundario] = useState(local.color_secundario);
  const [horas, setHoras] = useState(String(+(local.minutos_entre_puntos / 60).toFixed(2)));

  const h = Number(horas.replace(",", "."));
  const reglaTexto =
    !Number.isFinite(h) || h < 0
      ? ""
      : h === 0
        ? "Sin límite: cada toque suma (no recomendado)."
        : h < 1
          ? `Cada cliente puede sumar 1 punto cada ${Math.round(h * 60)} minutos.`
          : `Cada cliente puede sumar 1 punto cada ${h} ${h === 1 ? "hora" : "horas"}.`;

  return (
    <form action={accion} className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Tarjeta>
          <h2 className="font-medium">Regla de puntos</h2>
          <label className="mt-3 block max-w-xs">
            <span className="text-xs font-medium text-stone-600">Horas mínimas entre puntos</span>
            <input
              name="horas"
              type="number"
              inputMode="decimal"
              min={0}
              max={168}
              step="any"
              value={horas}
              onChange={(e) => setHoras(e.target.value)}
              className={inputPanel}
            />
          </label>
          <p className="mt-2 text-sm text-stone-600">{reglaTexto}</p>
          <p className="mt-1 text-xs text-stone-500">Evita que alguien sume varias veces en la misma visita. Para un café, 3 a 4 horas es razonable.</p>
        </Tarjeta>

        <Tarjeta>
          <h2 className="font-medium">Tu marca</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-stone-600">Nombre del local</span>
              <input name="nombre" required maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputPanel} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-stone-600">Rubro (opcional)</span>
              <input name="rubro" maxLength={60} defaultValue={local.rubro ?? ""} placeholder="Ej: Cafetería de especialidad" className={inputPanel} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-stone-600">Color principal</span>
              <div className="flex gap-2">
                <input type="color" name="color_primario" value={primario} onChange={(e) => setPrimario(e.target.value)} className="h-[38px] w-14 cursor-pointer rounded-lg border border-stone-300 bg-white p-1" />
                <input value={primario} readOnly className={`${inputPanel} font-mono`} aria-label="Código del color principal" />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-stone-600">Color de acento</span>
              <div className="flex gap-2">
                <input type="color" name="color_secundario" value={secundario} onChange={(e) => setSecundario(e.target.value)} className="h-[38px] w-14 cursor-pointer rounded-lg border border-stone-300 bg-white p-1" />
                <input value={secundario} readOnly className={`${inputPanel} font-mono`} aria-label="Código del color de acento" />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-stone-600">¿Cómo llamás a tu personal?</span>
              <select name="termino_personal" defaultValue={local.termino_personal} className={inputPanel}>
                {TERMINOS.map((t) => (
                  <option key={t} value={t}>
                    {capitalizar(plural(t))}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-stone-500">Se usa en la tarjeta: “Pedile al vendedor que apoye su llavero”.</span>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-stone-600">Logo (link https a una imagen cuadrada, opcional)</span>
              <input name="logo_url" type="url" defaultValue={local.logo_url ?? ""} placeholder="https://…/logo.png" className={inputPanel} />
            </label>
          </div>
        </Tarjeta>

        <ErrorForm mensaje={estado.error} />
        <div className="flex items-center gap-3">
          <BotonPrimario type="submit" disabled={pendiente}>
            {pendiente ? "Guardando…" : "Guardar cambios"}
          </BotonPrimario>
          {estado.ok && !pendiente && <span className="text-sm text-emerald-700">Guardado ✓</span>}
        </div>
      </div>

      {/* Vista previa de la tarjeta */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-stone-500">Así la ven tus clientes</p>
        <div className="rounded-[24px] p-5 shadow-lg" style={{ background: primario, color: textoSobre(primario) }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl font-semibold" style={{ background: secundario, color: primario }}>
              {nombre.charAt(0).toUpperCase() || "?"}
            </div>
            <p className="font-semibold">{nombre || "Tu local"}</p>
          </div>
          <p className="mt-6 text-4xl font-semibold">
            5 <span className="text-base font-normal opacity-80">puntos</span>
          </p>
          <div className="mt-4 grid grid-cols-8 gap-1.5">
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className="aspect-square rounded-full"
                style={i < 5 ? { background: secundario } : { border: "2px dashed currentColor", opacity: 0.35 }}
              />
            ))}
          </div>
        </div>
      </div>
    </form>
  );
}
