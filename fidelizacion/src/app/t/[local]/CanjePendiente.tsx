"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelarCanje } from "./actions";

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
    <section
      className="anim-subir relative overflow-hidden rounded-3xl p-6 text-center shadow-lg"
      style={{ background: "var(--marca-acento)", color: "var(--marca)" }}
    >
      <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
        <span className="anim-onda absolute inset-0 rounded-full bg-white/60" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow">📲</span>
      </div>
      <p className="mt-4 text-sm font-semibold uppercase tracking-widest opacity-80">Canje pendiente</p>
      <h2 className="mt-1 text-2xl font-semibold">{premio}</h2>
      <p className="mt-3 text-base">
        Mostrale esta pantalla al {termino} y pedile que <strong>apoye su llavero</strong> en tu celular.
      </p>
      <p className="mt-3 font-mono text-sm opacity-80">
        Vence en {mm}:{ss}
      </p>
      <button
        onClick={() => startTransition(() => cancelarCanje(slug, canjeId))}
        disabled={cancelando}
        className="mt-4 text-sm font-medium underline underline-offset-4 opacity-80 disabled:opacity-50"
      >
        {cancelando ? "Cancelando…" : "Cancelar canje"}
      </button>
    </section>
  );
}
