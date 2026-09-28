"use client";

import { useActionState, useState } from "react";
import { ingresar, type EstadoLogin } from "./actions";
import { BotonMarca, ErrorForm } from "@/components/Campo";
import { EtiquetaCampo, claseInput } from "@/components/app/Campos";

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
        <legend className="text-[13px] font-medium text-pt-ink">¿Quién sos?</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {mozos.map((m) => {
            const activo = actual === m.id;
            return (
              <button
                type="button"
                key={m.id}
                onClick={() => setElegido(m.id)}
                aria-pressed={activo}
                className={`h-pt-control rounded-pt-sm px-4 text-left text-[15px] font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pt-accent-dark ${
                  activo ? "bg-pt-ink text-white" : "bg-pt-pure text-pt-ink ring-1 ring-inset ring-pt-border hover:ring-pt-ink-3"
                }`}
              >
                {m.nombre}
              </button>
            );
          })}
        </div>
      </fieldset>
      <label className="block">
        <EtiquetaCampo>Tu PIN</EtiquetaCampo>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{4,6}"
          maxLength={6}
          required
          placeholder="••••"
          className={`${claseInput} text-center font-mono text-2xl tracking-[0.5em]`}
        />
      </label>
      <ErrorForm mensaje={estado.error} />
      <BotonMarca type="submit" pendiente={pendiente} disabled={!actual}>
        Entrar
      </BotonMarca>
    </form>
  );
}
