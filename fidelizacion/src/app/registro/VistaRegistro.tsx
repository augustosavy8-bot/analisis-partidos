import { estiloMarca, type Local } from "@/lib/locales";
import { formasTermino } from "@/lib/terminos";
import { CabeceraLocal } from "@/components/CabeceraLocal";
import { FormRegistro } from "./FormRegistro";

export function VistaRegistro({ local }: { local: Local }) {
  const puntosIniciales = local.puntos_bienvenida + 1;
  return (
    <div style={estiloMarca(local)} className="fondo-marca flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="px-1">
          <CabeceraLocal local={local} />
        </div>
        <div className="anim-subir mt-8 px-1">
          <p
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]"
            style={{ background: "var(--marca)", color: "var(--marca-acento)" }}
          >
            ✦ {puntosIniciales === 1 ? "+1 punto te espera" : `+${puntosIniciales} puntos te esperan`}
          </p>
          <h1 className="mt-3 text-[32px] font-semibold leading-tight tracking-tight text-stone-900">Creá tu tarjeta</h1>
          <p className="mt-1.5 text-stone-600">
            Es una sola vez. La próxima, el {formasTermino(local.termino_personal).singular} apoya el llavero y sumás al toque.
          </p>
        </div>
        <FormRegistro local={local} puntosIniciales={puntosIniciales} />
      </main>
    </div>
  );
}
