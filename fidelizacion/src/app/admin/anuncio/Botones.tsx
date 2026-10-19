"use client";

import { useState, useTransition } from "react";
import { mandarAnuncio, type Dueno, type ResultadoAnuncio } from "./actions";
import type { IdMailDueno } from "@/lib/anuncio";

export function BotonesAnuncio({ id, duenos, email }: { id: IdMailDueno; duenos: Dueno[]; email: string }) {
  const [r, setR] = useState<ResultadoAnuncio | null>(null);
  const [p, start] = useTransition();
  const [uno, setUno] = useState(duenos[0]?.email ?? "");
  const total = duenos.length;
  const mandar = (destino: string, pregunta?: string) => {
    if (pregunta && !confirm(pregunta)) return;
    setR(null);
    start(async () => setR(await mandarAnuncio(id, destino)));
  };
  const boton = "rounded-lg px-4 py-2 text-sm font-medium ring-1 ring-stone-300 hover:bg-stone-50 disabled:opacity-40";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={p} onClick={() => mandar("prueba")} className={boton}>
          {p ? "Mandando…" : `Probar conmigo (${email})`}
        </button>
        <button
          type="button"
          disabled={p || total === 0}
          onClick={() => mandar("todos", `¿Mandar este mail a ${total} ${total === 1 ? "dueño" : "dueños"}? No se puede deshacer.`)}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Mandar a {total} {total === 1 ? "dueño" : "dueños"}
        </button>
      </div>
      {total > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <select value={uno} onChange={(e) => setUno(e.target.value)} className="rounded-lg px-3 py-2 text-sm ring-1 ring-stone-300">
            {duenos.map((d) => (
              <option key={d.email} value={d.email}>
                {d.email} ({d.locales.join(", ")})
              </option>
            ))}
          </select>
          <button type="button" disabled={p || !uno} onClick={() => mandar(uno, `¿Mandar este mail a ${uno}?`)} className={boton}>
            Mandar sólo a este dueño
          </button>
        </div>
      )}
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
