import { Esqueleto } from "@/components/app/Superficie";

/** Mientras carga la tarjeta (por ej. recién apoyado el llavero). */
export default function Cargando() {
  return (
    <div className="pt-app flex flex-1 flex-col" aria-busy="true" aria-label="Cargando tu tarjeta">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Esqueleto className="h-4 w-14" />
        <Esqueleto className="mt-2 h-8 w-32" />
        <Esqueleto className="mt-5 aspect-[1.586/1] w-full !rounded-pt-lg" />
        <Esqueleto className="mt-3 h-4 w-2/3" />
        <Esqueleto className="mt-6 h-16 w-full !rounded-pt-card" />
        <Esqueleto className="mt-7 h-5 w-20" />
        <Esqueleto className="mt-3 h-40 w-full !rounded-pt-card" />
      </main>
      <div className="fixed inset-x-0 bottom-0 border-t border-pt-border/80 bg-pt-pure/85 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex h-pt-tabbar max-w-md items-center justify-around">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <Esqueleto className="h-6 w-6 !rounded-full" />
              <Esqueleto className="h-2.5 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
