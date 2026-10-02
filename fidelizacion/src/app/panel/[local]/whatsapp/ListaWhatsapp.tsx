"use client";

import { useState, useTransition } from "react";
import { escribirConIA, guardarPlantilla, marcarNoContactar, registrarContacto } from "./actions";
import { BotonSecundario, EtiquetaPanel, Tarjeta } from "@/components/Panel";
import { claseBoton } from "@/components/app/Boton";
import { claseTextarea } from "@/components/app/Campos";
import { confirmar } from "@/components/app/Dialogos";
import { avisar } from "@/components/app/Toasts";
import { Icono } from "@/components/Icono";
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
  /** Si está, se ofrece "Escribir con IA" para los que no vienen hace estos días. */
  iaDias?: number | null;
  local: string;
  link: string;
  filas: FilaReactivar[];
};

export function ListaWhatsapp({ slug, segmento, plantillaGuardada, iaDias, local, link, filas }: Props) {
  const original = plantillaGuardada ?? SEGMENTOS[segmento].plantilla;
  const [plantilla, setPlantilla] = useState(original);
  const [error, setError] = useState<string | null>(null);
  const [enviados, setEnviados] = useState<Set<string>>(new Set());
  const [pedidoIA, setPedidoIA] = useState("");
  const [escribiendo, startIA] = useTransition();

  function conIA() {
    if (!iaDias) return;
    startIA(async () => {
      const r = await escribirConIA(slug, iaDias, pedidoIA);
      if (r.error) {
        setError(r.error);
        return;
      }
      setError(null);
      setPlantilla(r.texto!);
      avisar("Listo: revisalo y guardalo si te gusta");
    });
  }
  const [pendiente, start] = useTransition();

  const mensaje = (f: FilaReactivar) =>
    armarMensaje(plantilla, { nombre: f.nombre, local, puntos: f.puntos, premio: f.premio_nombre, premioPuntos: f.premio_puntos, link });
  const ejemplo = filas.find((f) => !f.no_contactar);

  function guardar() {
    start(async () => {
      const r = await guardarPlantilla(slug, segmento, plantilla);
      setError(r.error ?? null);
      if (!r.error) avisar("Mensaje guardado");
    });
  }

  return (
    <>
      <Tarjeta className="mb-4">
        {iaDias ? (
          <div className="mb-4 rounded-pt-sm bg-pt-surface p-3">
            <p className="text-[14px] font-semibold text-pt-ink">✨ Escribir con IA</p>
            <p className="mt-0.5 pt-app-detalle text-pt-ink-2">
              Arma un mensaje para los que no vienen hace {iaDias} días, con tus premios y promos. Lo revisás antes de mandarlo.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                value={pedidoIA}
                onChange={(e) => setPedidoIA(e.target.value)}
                maxLength={200}
                placeholder="Opcional: ej. ofreceles un shot gratis el viernes"
                className={`${claseTextarea} min-w-0 flex-1 !py-2`}
              />
              <BotonSecundario onClick={conIA} disabled={escribiendo}>
                {escribiendo ? "Escribiendo…" : "Escribir con IA"}
              </BotonSecundario>
            </div>
          </div>
        ) : null}
        <label className="block">
          <EtiquetaPanel>Mensaje</EtiquetaPanel>
          <textarea
            value={plantilla}
            onChange={(e) => {
              setPlantilla(e.target.value);
            }}
            rows={4}
            maxLength={700}
            className={claseTextarea}
          />
        </label>
        <p className="mt-1.5 pt-app-detalle text-pt-ink-2">
          Se completan solos: <code>{"{nombre}"}</code> <code>{"{puntos}"}</code> <code>{"{premio}"}</code>{" "}
          <code>{"{faltan}"}</code> <code>{"{local}"}</code> <code>{"{link}"}</code> (link a su tarjeta).
        </p>
        {ejemplo && (
          <div className="mt-3 rounded-pt-sm rounded-tl-[4px] bg-pt-accent-soft px-3.5 py-2.5 pt-app-detalle text-pt-ink">
            <p className="mb-1 text-[12px] font-semibold text-pt-accent-ink">Así le llega a {ejemplo.nombre.split(" ")[0]}:</p>
            <p className="whitespace-pre-wrap break-words">{mensaje(ejemplo)}</p>
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <BotonSecundario onClick={guardar} disabled={pendiente || plantilla === original}>
            {pendiente ? "Guardando…" : "Guardar mensaje"}
          </BotonSecundario>
          {plantilla !== SEGMENTOS[segmento].plantilla && (
            <button onClick={() => setPlantilla(SEGMENTOS[segmento].plantilla)} className={claseBoton("fantasma", "sm")}>
              Volver al mensaje sugerido
            </button>
          )}
          {error && <span className="pt-app-detalle text-pt-error-ink">{error}</span>}
        </div>
      </Tarjeta>

      <Tarjeta className="overflow-hidden !p-0">
        <ul className="divide-y divide-pt-border">
          {filas.map((f) => {
            const enviado = enviados.has(f.cliente_id);
            return (
              <li key={f.cliente_id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${f.no_contactar ? "opacity-70" : ""}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-pt-ink">{f.nombre}</p>
                  <p className="pt-app-detalle text-pt-ink-2">{f.detalle}</p>
                  {f.no_contactar ? (
                    <p className="mt-0.5 pt-app-detalle text-pt-ink-2">
                      Pidió no recibir mensajes ·{" "}
                      <button onClick={() => start(() => marcarNoContactar(slug, f.cliente_id, false))} className="font-medium text-pt-ink underline">
                        deshacer
                      </button>
                    </p>
                  ) : (
                    (enviado || f.ultimo_contacto) && (
                      <p className="mt-0.5 flex items-center gap-1 pt-app-detalle font-medium text-pt-accent-ink">
                        <Icono nombre="check" tamaño={14} /> Le escribiste {enviado ? "recién" : haceCuanto(f.ultimo_contacto!)}
                      </p>
                    )
                  )}
                </div>
                {!f.no_contactar && (
                  <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                    <button
                      onClick={async () => {
                        const ok = await confirmar({
                          titulo: `¿${f.nombre} pidió no recibir más mensajes?`,
                          texto: "No va a aparecer para enviarle WhatsApp. Lo podés deshacer.",
                          confirmar: "No escribir más",
                        });
                        if (ok) start(() => marcarNoContactar(slug, f.cliente_id, true));
                      }}
                      className={claseBoton("fantasma", "sm", "!px-2 !text-[12px]")}
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
                      className={claseBoton(enviado || f.ultimo_contacto ? "secundario" : "acento", "sm", "!rounded-full")}
                    >
                      <Icono nombre="whatsapp" tamaño={16} />
                      {enviado || f.ultimo_contacto ? "Reenviar" : "Enviar"}
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
