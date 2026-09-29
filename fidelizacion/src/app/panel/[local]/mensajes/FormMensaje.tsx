"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enviarMensaje, type EstadoMensaje } from "./actions";
import { BotonPrimario, EtiquetaPanel, inputPanel } from "@/components/Panel";
import { claseTextarea } from "@/components/app/Campos";
import { Aviso } from "@/components/app/Superficie";
import { confirmar } from "@/components/app/Dialogos";
import { avisar } from "@/components/app/Toasts";
import { ErrorForm } from "@/components/Campo";
import { LIMITES_MENSAJE } from "@/lib/mensajes";

type Props = {
  slug: string;
  comercio: string;
  logo: string | null;
  destinatarios: { google: number; apple: number };
  /** Fecha y hora (ya formateada) desde la que se puede mandar el próximo; null = ya se puede. */
  proximo: string | null;
  enviando: boolean;
};

export function FormMensaje({ slug, comercio, logo, destinatarios, proximo, enviando }: Props) {
  const [estado, accion, pendiente] = useActionState<EstadoMensaje, FormData>(enviarMensaje.bind(null, slug), {});
  const [, startTransition] = useTransition();
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const router = useRouter();
  const total = destinatarios.google + destinatarios.apple;

  useEffect(() => {
    // Tras enviar, la página muestra el aviso del próximo mensaje en lugar del formulario.
    if (estado.ok) avisar("Mensaje enviado");
  }, [estado.ok]);

  // Mientras se envía (en segundo plano), refrescamos para mostrar a cuántos llegó.
  useEffect(() => {
    if (!enviando) return;
    const id = setTimeout(() => router.refresh(), 4000);
    return () => clearTimeout(id);
  }, [enviando, router]);

  async function alEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    const ok = await confirmar({
      titulo: "¿Mandar el mensaje?",
      texto:
        total > 0
          ? `Les llega como notificación a ${total} ${total === 1 ? "cliente" : "clientes"}. Después no se puede borrar y el próximo lo vas a poder mandar en 24 horas.`
          : "Todavía nadie tiene tu tarjeta en la billetera: el mensaje queda en el historial y va a aparecer en las tarjetas de Apple Wallet que se agreguen.",
      confirmar: "Mandar",
    });
    if (ok) startTransition(() => accion(datos));
  }

  if (proximo) {
    return (
      <Aviso tono="suave" icono="historial">
        Ya mandaste el mensaje de hoy. Vas a poder mandar el próximo el <strong className="text-pt-ink">{proximo}</strong>.
      </Aviso>
    );
  }

  return (
    <form onSubmit={alEnviar} className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        <label className="block">
          <EtiquetaPanel>Título</EtiquetaPanel>
          <input
            name="titulo"
            required
            minLength={2}
            maxLength={LIMITES_MENSAJE.titulo}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: Hoy 2x1 en medialunas"
            className={inputPanel}
          />
          <Contador actual={titulo.length} maximo={LIMITES_MENSAJE.titulo} />
        </label>
        <label className="block">
          <EtiquetaPanel>Mensaje</EtiquetaPanel>
          <textarea
            name="texto"
            required
            minLength={2}
            maxLength={LIMITES_MENSAJE.texto}
            rows={3}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ej: Hasta las 12, mostrando tu tarjeta. ¡Te esperamos!"
            className={`${claseTextarea} resize-none text-[15px]`}
          />
          <Contador actual={texto.length} maximo={LIMITES_MENSAJE.texto} />
        </label>
        <p className="pt-app-detalle text-pt-ink-2">
          {total > 0 ? (
            <>
              Tienen tu tarjeta en la billetera: <strong className="text-pt-ink">{destinatarios.google}</strong> en Google Wallet y{" "}
              <strong className="text-pt-ink">{destinatarios.apple}</strong> en Apple Wallet.
            </>
          ) : (
            "Todavía ningún cliente agregó tu tarjeta a Apple Wallet o Google Wallet."
          )}
        </p>
        <ErrorForm mensaje={estado.error} />
        <BotonPrimario type="submit" disabled={pendiente || titulo.trim().length < 2 || texto.trim().length < 2}>
          {pendiente ? "Enviando…" : "Enviar mensaje"}
        </BotonPrimario>
      </div>

      {/* Vista previa de la notificación */}
      <div>
        <p className="pt-label mb-2 uppercase text-pt-ink-2">Así les llega</p>
        <div className="rounded-[22px] bg-pt-ink/[0.06] p-3">
          <div className="flex gap-3 rounded-[16px] bg-pt-pure/90 p-3 shadow-pt-flotante">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="h-9 w-9 shrink-0 rounded-[9px] object-cover" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-pt-ink text-sm font-bold text-pt-accent" aria-hidden>
                {comercio.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="flex justify-between gap-2 text-[12px] text-pt-ink-2">
                <span className="truncate font-medium uppercase tracking-wide">{comercio}</span>
                <span className="shrink-0">ahora</span>
              </p>
              <p className="truncate text-[14px] font-semibold text-pt-ink">{titulo.trim() || "Título del mensaje"}</p>
              <p className="line-clamp-4 break-words text-[14px] leading-snug text-pt-ink">{texto.trim() || "El texto que escribas aparece acá."}</p>
            </div>
          </div>
        </div>
        <p className="mt-2 pt-app-detalle text-pt-ink-2">En Apple Wallet también queda en “Novedades”, al dorso de la tarjeta.</p>
      </div>
    </form>
  );
}

function Contador({ actual, maximo }: { actual: number; maximo: number }) {
  const cerca = actual > maximo * 0.9;
  return (
    <span className={`mt-1.5 block text-right pt-app-detalle tabular-nums ${cerca ? "text-pt-warning-ink" : "text-pt-ink-2"}`} aria-live="polite">
      {actual}/{maximo}
    </span>
  );
}
