"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { quitarIcono, subirIcono, type EstadoIcono } from "./actions";
import { BotonPrimario, BotonSecundario, Tarjeta } from "@/components/Panel";
import { avisar } from "@/components/app/Toasts";
import { confirmar } from "@/components/app/Dialogos";
import { ErrorForm } from "@/components/Campo";
import { ICONO, validarDimensiones, type FuenteIcono } from "@/lib/icono";

type Props = {
  slug: string;
  comercio: string;
  colorPrimario: string;
  fuente: FuenteIcono["tipo"];
  /** URL del ícono generado (el mismo que usa el pase), con versión para evitar la caché. */
  vistaPrevia: string;
};

const TEXTO_FUENTE = {
  icono: "Estás usando tu ícono.",
  logo: "Estás usando tu logo, recortado a cuadrado. Subí un ícono para que se vea mejor.",
  inicial: "Estás usando la inicial del local. Subí un ícono con tu logo.",
};

export function FormIcono({ slug, comercio, colorPrimario, fuente, vistaPrevia }: Props) {
  const [estado, accion, subiendo] = useActionState<EstadoIcono, FormData>(subirIcono.bind(null, slug), {});
  const [quitando, startQuitar] = useTransition();
  const [elegidoCrudo, setElegido] = useState<{ url: string; error: string | null; en: number } | null>(null);
  // Después de subir, volvemos a mostrar el ícono generado (hasta que elijan otro archivo).
  const elegido = elegidoCrudo && (!estado.ok || elegidoCrudo.en > estado.ok) ? elegidoCrudo : null;
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!estado.ok) return;
    avisar("Ícono actualizado. Los iPhone lo van a ver en unos minutos.");
    if (input.current) input.current.value = "";
  }, [estado.ok]);

  // Libera la URL local de la vista previa.
  useEffect(() => () => void (elegidoCrudo && URL.revokeObjectURL(elegidoCrudo.url)), [elegidoCrudo]);

  /** Valida en el navegador (tipo, tamaño y medidas) antes de subir. */
  function alElegir(archivo: File | undefined) {
    if (!archivo) return setElegido(null);
    const url = URL.createObjectURL(archivo);
    const en = Date.now();
    if (archivo.type !== "image/png") return setElegido({ url, en, error: "Tiene que ser un archivo PNG." });
    if (archivo.size > ICONO.maxBytes) return setElegido({ url, en, error: "El archivo pesa más de 2 MB. Exportalo más liviano." });
    const img = new Image();
    img.onload = () => setElegido({ url, en, error: validarDimensiones({ ancho: img.naturalWidth, alto: img.naturalHeight }) });
    img.onerror = () => setElegido({ url, en, error: "No pudimos leer la imagen." });
    img.src = url;
  }

  const mostrado = elegido && !elegido.error ? null : vistaPrevia;

  return (
    <Tarjeta className="mt-4">
      <h2 className="pt-app-seccion text-pt-ink">Ícono de notificaciones</h2>
      <p className="mt-1 pt-app-detalle text-pt-ink-2">
        Es el que aparece en las notificaciones de Apple Wallet (puntos, mensajes y cuando el cliente está cerca). PNG
        cuadrado de al menos {ICONO.minimo}×{ICONO.minimo}; lo ponemos sobre tu color principal ocupando casi todo el
        cuadrado.
      </p>

      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
        {/* Vista previa en una notificación */}
        <div className="w-full max-w-[300px] shrink-0 rounded-[22px] bg-pt-ink/[0.06] p-3">
          <div className="flex gap-3 rounded-[16px] bg-pt-pure/90 p-3 shadow-pt-flotante">
            {mostrado ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mostrado} alt={`Ícono de ${comercio}`} width={38} height={38} className="h-[38px] w-[38px] shrink-0 rounded-[9px]" />
            ) : (
              // Igual que el generado: el ícono al 80% sobre el color principal.
              <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-[9px]" style={{ background: colorPrimario }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={elegido!.url} alt="Ícono elegido" className="h-[80%] w-[80%] object-cover" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="flex justify-between gap-2 text-[12px] text-pt-ink-2">
                <span className="truncate font-medium uppercase tracking-wide">{comercio}</span>
                <span className="shrink-0">ahora</span>
              </p>
              <p className="text-[14px] leading-snug text-pt-ink">Sumaste puntos: ahora tenés 8</p>
            </div>
          </div>
        </div>

        <form action={accion} className="min-w-0 flex-1 space-y-3">
          <p className="pt-app-detalle font-medium text-pt-ink">{elegido && !elegido.error ? "Así se va a ver tu ícono. Subilo para que lo tomen los pases." : TEXTO_FUENTE[fuente]}</p>
          <input
            ref={input}
            name="icono"
            type="file"
            accept="image/png"
            required
            onChange={(e) => alElegir(e.target.files?.[0])}
            className="block w-full text-[14px] text-pt-ink-2 file:mr-3 file:h-pt-control-sm file:cursor-pointer file:rounded-full file:border file:border-pt-border file:bg-pt-pure file:px-4 file:text-[13px] file:font-semibold file:text-pt-ink hover:file:bg-pt-surface"
          />
          <ErrorForm mensaje={elegido?.error ?? estado.error} />
          <div className="flex flex-wrap gap-2">
            <BotonPrimario type="submit" disabled={subiendo || !elegido || !!elegido.error}>
              {subiendo ? "Subiendo…" : "Subir ícono"}
            </BotonPrimario>
            {fuente === "icono" && (
              <BotonSecundario
                type="button"
                disabled={quitando}
                onClick={async () => {
                  const ok = await confirmar({ titulo: "¿Quitar el ícono?", texto: "Vuelve a usarse tu logo (o la inicial del local).", confirmar: "Quitar", peligro: true });
                  if (!ok) return;
                  startQuitar(async () => {
                    const r = await quitarIcono(slug);
                    avisar(r.error ?? "Ícono quitado", r.error ? "error" : undefined);
                  });
                }}
              >
                {quitando ? "Quitando…" : "Quitar ícono"}
              </BotonSecundario>
            )}
          </div>
        </form>
      </div>
    </Tarjeta>
  );
}
