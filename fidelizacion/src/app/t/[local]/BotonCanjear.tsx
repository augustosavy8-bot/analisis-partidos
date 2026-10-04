"use client";

import { useState, useTransition } from "react";
import { solicitarCanje } from "./actions";
import { Boton } from "@/components/app/Boton";
import { claseInput } from "@/components/app/Campos";

type Equipo = { id: string; nombre: string }[];

/**
 * Canjear al toque. Si el toque fue con un chip de link fijo, alguien del local
 * confirma con su PIN en este mismo celular.
 */
export function BotonCanjear({ slug, premioId }: { slug: string; premioId: string }) {
  const [pendiente, startTransition] = useTransition();
  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [mozoId, setMozoId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  function canjear(confirmacion?: { mozoId: string; pin: string }) {
    setError(null);
    startTransition(async () => {
      const r = await solicitarCanje(slug, premioId, confirmacion);
      if (r?.requierePin) {
        setEquipo(r.requierePin.equipo);
        setMozoId(r.requierePin.equipo.length === 1 ? r.requierePin.equipo[0].id : "");
      }
      if (r?.error) setError(r.error);
      if (confirmacion) setPin("");
    });
  }

  if (!equipo) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Boton variante="acento" tamaño="sm" className="!rounded-full !px-4" onClick={() => canjear()} pendiente={pendiente} textoPendiente="…">
          Canjear
        </Boton>
        {error && <p className="max-w-40 text-right text-[12px] text-pt-error-ink">{error}</p>}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal aria-labelledby="titulo-pin">
      <form
        className="w-full max-w-sm space-y-3 rounded-pt-card bg-pt-pure p-5 shadow-pt-flotante"
        onSubmit={(e) => {
          e.preventDefault();
          if (mozoId && /^\d{4,6}$/.test(pin)) canjear({ mozoId, pin });
        }}
      >
        <h2 id="titulo-pin" className="pt-app-seccion text-pt-ink">
          Confirmá el canje
        </h2>
        <p className="pt-app-detalle text-pt-ink-2">Alguien del local tiene que poner su PIN en este celular.</p>
        {equipo.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {equipo.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMozoId(m.id)}
                className={`rounded-full px-3.5 py-1.5 text-[14px] ring-1 ${m.id === mozoId ? "bg-pt-ink text-pt-pure ring-pt-ink" : "text-pt-ink ring-pt-border"}`}
              >
                {m.nombre}
              </button>
            ))}
          </div>
        )}
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="off"
          type="password"
          placeholder="PIN"
          aria-label="PIN"
          className={`${claseInput} text-center tracking-[0.4em]`}
          autoFocus
        />
        {error && <p className="text-[13px] text-pt-error-ink">{error}</p>}
        <div className="flex gap-2">
          <Boton type="button" variante="secundario" className="flex-1" onClick={() => setEquipo(null)}>
            Cancelar
          </Boton>
          <Boton type="submit" variante="acento" className="flex-1" pendiente={pendiente} disabled={!mozoId || pin.length < 4}>
            Canjear
          </Boton>
        </div>
      </form>
    </div>
  );
}
