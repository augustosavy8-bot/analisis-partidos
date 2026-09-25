"use client";

import { useState, useTransition } from "react";
import { guardarPlantilla, marcarNoContactar, registrarContacto } from "./actions";
import { BotonSecundario, Tarjeta } from "@/components/Panel";
import { armarMensaje, haceCuanto, linkWhatsapp, SEGMENTOS, type Segmento } from "@/lib/reactivar";

export type FilaReactivar = {
  cliente_id: string;
  nombre: string;
  whatsapp: string;
  puntos: number;
  detalle: string;
  premio_nombre: string | null;
  premio_puntos: number | null;
  ultimo_contacto: string | null;
  no_contactar: boolean;
};

type Props = {
  slug: string;
  segmento: Segmento;
  plantillaGuardada: string | null;
  local: string;
  link: string;
  filas: FilaReactivar[];
};

export function ListaWhatsapp({ slug, segmento, plantillaGuardada, local, link, filas }: Props) {
  const original = plantillaGuardada ?? SEGMENTOS[segmento].plantilla;
  const [plantilla, setPlantilla] = useState(original);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [enviados, setEnviados] = useState<Set<string>>(new Set());
  const [pendiente, start] = useTransition();

  const mensaje = (f: FilaReactivar) =>
    armarMensaje(plantilla, { nombre: f.nombre, local, puntos: f.puntos, premio: f.premio_nombre, premioPuntos: f.premio_puntos, link });
  const ejemplo = filas.find((f) => !f.no_contactar);

  function guardar() {
    start(async () => {
      const r = await guardarPlantilla(slug, segmento, plantilla);
      setError(r.error ?? null);
      setGuardado(!r.error);
    });
  }

  return (
    <>
      <Tarjeta className="mb-4">
        <label className="block">
          <span className="text-sm font-medium">Mensaje</span>
          <textarea
            value={plantilla}
            onChange={(e) => {
              setPlantilla(e.target.value);
              setGuardado(false);
            }}
            rows={4}
            maxLength={700}
            className="mt-1.5 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base outline-none focus:border-[var(--marca)] focus:ring-2 focus:ring-[var(--marca)]/20 sm:text-sm"
          />
        </label>
        <p className="mt-1.5 text-xs text-stone-500">
          Se completan solos: <code>{"{nombre}"}</code> <code>{"{puntos}"}</code> <code>{"{premio}"}</code>{" "}
          <code>{"{faltan}"}</code> <code>{"{local}"}</code> <code>{"{link}"}</code> (link a su tarjeta).
        </p>
        {ejemplo && (
          <div className="mt-3 rounded-xl bg-[#e7fbe0] px-3.5 py-2.5 text-sm text-stone-800">
            <p className="mb-1 text-xs font-medium text-stone-500">Así le llega a {ejemplo.nombre.split(" ")[0]}:</p>
            <p className="whitespace-pre-wrap break-words">{mensaje(ejemplo)}</p>
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <BotonSecundario onClick={guardar} disabled={pendiente || plantilla === original}>
            {pendiente ? "Guardando…" : "Guardar mensaje"}
          </BotonSecundario>
          {plantilla !== SEGMENTOS[segmento].plantilla && (
            <button onClick={() => setPlantilla(SEGMENTOS[segmento].plantilla)} className="text-sm text-stone-500 underline underline-offset-2">
              Volver al mensaje sugerido
            </button>
          )}
          {guardado && <span className="text-sm text-emerald-700">Guardado ✓</span>}
          {error && <span className="text-sm text-red-700">{error}</span>}
        </div>
      </Tarjeta>

      <Tarjeta className="!p-0 overflow-hidden">
        <ul className="divide-y divide-stone-100">
          {filas.map((f) => {
            const enviado = enviados.has(f.cliente_id);
            return (
              <li key={f.cliente_id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${f.no_contactar ? "opacity-60" : ""}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{f.nombre}</p>
                  <p className="text-xs text-stone-500">{f.detalle}</p>
                  {f.no_contactar ? (
                    <p className="mt-0.5 text-xs text-stone-500">
                      Pidió no recibir mensajes ·{" "}
                      <button onClick={() => start(() => marcarNoContactar(slug, f.cliente_id, false))} className="underline">
                        deshacer
                      </button>
                    </p>
                  ) : (
                    (enviado || f.ultimo_contacto) && (
                      <p className="mt-0.5 text-xs font-medium text-emerald-700">
                        ✓ Le escribiste {enviado ? "recién" : haceCuanto(f.ultimo_contacto!)}
                      </p>
                    )
                  )}
                </div>
                {!f.no_contactar && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => confirm(`¿${f.nombre} pidió no recibir más mensajes?`) && start(() => marcarNoContactar(slug, f.cliente_id, true))}
                      className="px-1 text-xs text-stone-400 underline underline-offset-2"
                    >
                      No escribir más
                    </button>
                    <a
                      href={linkWhatsapp(f.whatsapp, mensaje(f))}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        setEnviados((s) => new Set(s).add(f.cliente_id));
                        void registrarContacto(slug, f.cliente_id, segmento);
                      }}
                      className={`rounded-lg px-3.5 py-2 text-sm font-semibold text-white shadow-sm ${enviado || f.ultimo_contacto ? "bg-[#25d366]/70" : "bg-[#1fa855]"}`}
                    >
                      {enviado || f.ultimo_contacto ? "Reenviar" : "Enviar WhatsApp"}
                    </a>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Tarjeta>
    </>
  );
}
