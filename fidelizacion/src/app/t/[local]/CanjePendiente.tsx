"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelarCanje } from "./actions";
import { OndasNfc } from "@/components/Animaciones";

type Props = { slug: string; canjeId: string; premio: string; expiraEn: string; termino: string };

export function CanjePendiente({ slug, canjeId, premio, expiraEn, termino }: Props) {
  const router = useRouter();
  const [ahora, setAhora] = useState(() => Date.now());
  const [cancelando, startTransition] = useTransition();
  const restante = Math.max(0, new Date(expiraEn).getTime() - ahora);

  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    // Refrescamos por si ya lo validaron desde otra pestaña.
    const refresco = setInterval(() => router.refresh(), 5000);
    return () => {
      clearInterval(reloj);
      clearInterval(refresco);
    };
  }, [router]);

  useEffect(() => {
    if (restante === 0) router.refresh();
  }, [restante, router]);

  const mm = Math.floor(restante / 60000);
  const ss = String(Math.floor((restante % 60000) / 1000)).padStart(2, "0");

  return (
    <section className="pt-subir relative overflow-hidden rounded-pt-lg bg-pt-card p-6 text-center text-white shadow-pt-card-app">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--color-pt-accent) 22%, transparent), transparent 60%)" }}
        aria-hidden
      />
      <div className="relative">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
          <OndasNfc punto="var(--color-pt-accent)" ondas="#fff" tamaño={56} />
        </div>
        <p className="pt-label mt-4 uppercase text-pt-accent">Canje pendiente</p>
        <h2 className="pt-app-titulo mt-1">{premio}</h2>
        <p className="mt-3 pt-app-texto text-white/85">
          Mostrale esta pantalla al {termino} y pedile que <strong className="text-white">apoye su llavero</strong> en tu celular.
        </p>
        <p className="mt-1.5 pt-app-detalle text-white/70">Tocá el aviso que aparece arriba: la confirmación se abre en una pestaña nueva.</p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 pt-app-detalle font-semibold tabular-nums">
          <span className="h-2 w-2 rounded-full bg-pt-accent motion-safe:animate-pulse" aria-hidden />
          Vence en {mm}:{ss}
        </p>
        <div>
          <button
            onClick={() => startTransition(() => cancelarCanje(slug, canjeId))}
            disabled={cancelando}
            className="mt-4 rounded-full px-3 py-1.5 pt-app-detalle font-medium text-white/80 underline underline-offset-4 transition-colors duration-150 hover:text-white disabled:opacity-50"
          >
            {cancelando ? "Cancelando…" : "Cancelar canje"}
          </button>
        </div>
      </div>
    </section>
  );
}
