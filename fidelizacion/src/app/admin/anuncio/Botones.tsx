"use client";

import { useState, useTransition } from "react";
import { mandarAnuncio, type ResultadoAnuncio } from "./actions";

export function BotonesAnuncio({ destinatarios, email }: { destinatarios: number; email: string }) {
  const [r, setR] = useState<ResultadoAnuncio | null>(null);
  const [p, start] = useTransition();
  const mandar = (prueba: boolean) => {
    if (!prueba && !confirm(`¿Mandar el anuncio a ${destinatarios} ${destinatarios === 1 ? "dueño" : "dueños"}? No se puede deshacer.`)) return;
    setR(null);
    start(async () => setR(await mandarAnuncio(prueba)));
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={p} onClick={() => mandar(true)} className="rounded-lg px-4 py-2 text-sm font-medium ring-1 ring-stone-300 hover:bg-stone-50 disabled:opacity-40">
          {p ? "Mandando…" : `Probar conmigo (${email})`}
        </button>
        <button type="button" disabled={p || destinatarios === 0} onClick={() => mandar(false)} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
          Mandar a {destinatarios} {destinatarios === 1 ? "dueño" : "dueños"}
        </button>
      </div>
      {r?.error && <p className="text-sm text-red-700">{r.error}</p>}
      {r && !r.error && (
        <p className={`text-sm ${r.fallidos ? "text-amber-700" : "text-emerald-700"}`}>
          ✓ Enviados: {r.enviados}
          {r.fallidos ? ` · Fallaron: ${r.fallidos} (mirá los logs de Vercel)` : ""}
        </p>
      )}
    </div>
  );
}
