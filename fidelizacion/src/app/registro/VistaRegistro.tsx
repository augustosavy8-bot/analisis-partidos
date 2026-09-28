import type { Local } from "@/lib/locales";
import { formasTermino } from "@/lib/terminos";
import { CabeceraLocal } from "@/components/CabeceraLocal";
import { Insignia } from "@/components/app/Superficie";
import { MotionProvider } from "@/components/landing/MotionProvider";
import { FormRegistro } from "./FormRegistro";

export function VistaRegistro({ local }: { local: Local }) {
  const puntosIniciales = local.puntos_bienvenida + 1;
  return (
    <div className="pt-app flex flex-1 flex-col">
      <MotionProvider>
        <main className="mx-auto w-full max-w-md flex-1 px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="px-1">
            <CabeceraLocal local={local} />
          </div>
          <div className="pt-subir mt-7 px-1">
            <Insignia tono="acento">{puntosIniciales === 1 ? "+1 punto te espera" : `+${puntosIniciales} puntos te esperan`}</Insignia>
            <h1 className="pt-app-titulo mt-2.5 text-pt-ink">Creá tu tarjeta</h1>
            <p className="mt-1.5 pt-app-texto text-pt-ink-2">
              Es una sola vez. La próxima, el {formasTermino(local.termino_personal).singular} apoya el llavero y sumás al toque.
            </p>
          </div>
          <FormRegistro local={local} puntosIniciales={puntosIniciales} />
        </main>
      </MotionProvider>
    </div>
  );
}
