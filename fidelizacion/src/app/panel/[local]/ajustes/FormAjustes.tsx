"use client";

import { useActionState, useEffect, useState } from "react";
import { guardarAjustes, type EstadoAjustes } from "./actions";
import { BotonPrimario, EtiquetaPanel, Tarjeta, inputPanel } from "@/components/Panel";
import { PointCard } from "@/components/landing/PointCard";
import { avisar } from "@/components/app/Toasts";
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
  latitud: number | null;
  longitud: number | null;
};

export function FormAjustes({ local }: { local: Local }) {
  const [estado, accion, pendiente] = useActionState<EstadoAjustes, FormData>(guardarAjustes.bind(null, local.slug), {});
  const [nombre, setNombre] = useState(local.nombre);
  const [primario, setPrimario] = useState(local.color_primario);
  const [secundario, setSecundario] = useState(local.color_secundario);
  useEffect(() => {
    if (estado.ok) avisar("Cambios guardados");
  }, [estado.ok]);
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
          <h2 className="pt-app-seccion text-pt-ink">Regla de puntos</h2>
          <label className="mt-3 block max-w-xs">
            <EtiquetaPanel>Horas mínimas entre puntos</EtiquetaPanel>
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
          <p className="mt-2 pt-app-detalle font-medium text-pt-ink">{reglaTexto}</p>
          <p className="mt-1 pt-app-detalle text-pt-ink-2">Evita que alguien sume varias veces en la misma visita. Para un café, 3 a 4 horas es razonable.</p>
        </Tarjeta>

        <Tarjeta>
          <h2 className="pt-app-seccion text-pt-ink">Tu local</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <EtiquetaPanel>Nombre del local</EtiquetaPanel>
              <input name="nombre" required maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputPanel} />
            </label>
            <label className="block">
              <EtiquetaPanel>Rubro (opcional)</EtiquetaPanel>
              <input name="rubro" maxLength={60} defaultValue={local.rubro ?? ""} placeholder="Ej: Cafetería de especialidad" className={inputPanel} />
            </label>
            <label className="block">
              <EtiquetaPanel>Color principal (billetera)</EtiquetaPanel>
              <div className="flex gap-2">
                <input type="color" name="color_primario" value={primario} onChange={(e) => setPrimario(e.target.value)} className="h-pt-control-sm w-14 shrink-0 cursor-pointer rounded-pt-sm border border-pt-border bg-pt-pure p-1" />
                <input value={primario} readOnly className={`${inputPanel} font-mono`} aria-label="Código del color principal" />
              </div>
            </label>
            <label className="block">
              <EtiquetaPanel>Color de acento (billetera)</EtiquetaPanel>
              <div className="flex gap-2">
                <input type="color" name="color_secundario" value={secundario} onChange={(e) => setSecundario(e.target.value)} className="h-pt-control-sm w-14 shrink-0 cursor-pointer rounded-pt-sm border border-pt-border bg-pt-pure p-1" />
                <input value={secundario} readOnly className={`${inputPanel} font-mono`} aria-label="Código del color de acento" />
              </div>
            </label>
            <label className="block">
              <EtiquetaPanel>¿Cómo llamás a tu personal?</EtiquetaPanel>
              <select name="termino_personal" defaultValue={local.termino_personal} className={inputPanel}>
                {TERMINOS.map((t) => (
                  <option key={t} value={t}>
                    {capitalizar(plural(t))}
                  </option>
                ))}
              </select>
              <span className="mt-1.5 block pt-app-detalle text-pt-ink-2">Se usa en la tarjeta: “Pedile al vendedor que apoye su llavero”.</span>
            </label>
            <label className="block sm:col-span-2">
              <EtiquetaPanel>Logo (link https a una imagen cuadrada, opcional)</EtiquetaPanel>
              <input name="logo_url" type="url" defaultValue={local.logo_url ?? ""} placeholder="https://…/logo.png" className={inputPanel} />
            </label>
          </div>
        </Tarjeta>

        <Tarjeta>
          <h2 className="pt-app-seccion text-pt-ink">Ubicación (opcional)</h2>
          <p className="mt-1 pt-app-detalle text-pt-ink-2">
            Con la ubicación, el pase de Apple Wallet aparece en la pantalla bloqueada del cliente cuando está cerca del local.
            En Google Maps, mantené apretado sobre el local y copiá los dos números.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <EtiquetaPanel>Latitud</EtiquetaPanel>
              <input name="latitud" inputMode="decimal" defaultValue={local.latitud ?? ""} placeholder="Ej: -32.9468" className={inputPanel} />
            </label>
            <label className="block">
              <EtiquetaPanel>Longitud</EtiquetaPanel>
              <input name="longitud" inputMode="decimal" defaultValue={local.longitud ?? ""} placeholder="Ej: -60.6393" className={inputPanel} />
            </label>
          </div>
        </Tarjeta>

        <ErrorForm mensaje={estado.error} />
        <BotonPrimario type="submit" disabled={pendiente} className="!h-11 !rounded-full !px-5 !text-[15px]">
          {pendiente ? "Guardando…" : "Guardar cambios"}
        </BotonPrimario>
      </div>

      {/* Vista previa de la tarjeta */}
      <div className="lg:sticky lg:top-40 lg:self-start">
        <p className="pt-label mb-2 uppercase text-pt-ink-2">Así la ven tus clientes</p>
        <div className="rounded-pt-lg shadow-pt-card-app">
          <PointCard comercio={nombre || "Tu local"} inicial={(nombre || "T").charAt(0).toUpperCase()} logo={local.logo_url} puntos={5} meta={8} premio="tu premio" reflejo={false} />
        </div>
        <div className="mt-3 flex items-center gap-2 pt-app-detalle text-pt-ink-2">
          <span className="h-4 w-4 rounded-full ring-1 ring-pt-border" style={{ background: primario }} aria-hidden />
          <span className="h-4 w-4 rounded-full ring-1 ring-pt-border" style={{ background: secundario }} aria-hidden />
          Tus colores se usan en la imagen para la billetera.
        </div>
      </div>
    </form>
  );
}
