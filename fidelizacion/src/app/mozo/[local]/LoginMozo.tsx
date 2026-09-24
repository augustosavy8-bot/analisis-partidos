"use client";

import { useActionState, useState } from "react";
import { ingresar, type EstadoLogin } from "./actions";
import { BotonMarca, ErrorForm } from "@/components/Campo";

type Mozo = { id: string; nombre: string };

export function LoginMozo({ slug, mozos }: { slug: string; mozos: Mozo[] }) {
  const [estado, accion, pendiente] = useActionState<EstadoLogin, FormData>(ingresar, {});
  const [elegido, setElegido] = useState<string | undefined>(estado.mozoId);
  const actual = elegido ?? estado.mozoId;

  return (
    <form action={accion} className="space-y-6">
      <input type="hidden" name="l" value={slug} />
      <input type="hidden" name="mozo" value={actual ?? ""} />
      <fieldset>
        <legend className="text-sm font-medium text-stone-700">¿Quién sos?</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {mozos.map((m) => {
            const activo = actual === m.id;
            return (
              <button
                type="button"
                key={m.id}
                onClick={() => setElegido(m.id)}
                aria-pressed={activo}
                className="rounded-xl border px-4 py-3 text-left font-medium transition"
                style={
                  activo
                    ? { background: "var(--marca)", color: "var(--marca-texto)", borderColor: "var(--marca)" }
                    : { background: "white", borderColor: "#d6d3d1" }
                }
              >
                {m.nombre}
              </button>
            );
          })}
        </div>
      </fieldset>
      <label className="block">
        <span className="text-sm font-medium text-stone-700">Tu PIN</span>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{4,6}"
          maxLength={6}
          required
          placeholder="••••"
          className="mt-1.5 block w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] outline-none focus:border-[var(--marca)] focus:ring-2 focus:ring-[var(--marca)]/20"
        />
      </label>
      <ErrorForm mensaje={estado.error} />
      <BotonMarca type="submit" pendiente={pendiente} disabled={!actual}>
        Entrar
      </BotonMarca>
    </form>
  );
}
