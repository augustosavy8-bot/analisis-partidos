import type { Premio } from "@/lib/tarjeta";
import { BotonCanjear } from "./BotonCanjear";
import { Icono } from "@/components/Icono";

/** Premios del local con un anillo de progreso cada uno. */
type Props = {
  slug: string;
  premios: Premio[];
  puntos: number;
  hayCanjePendiente: boolean;
  alToque: boolean;
  termino: string;
};

export function ListaPremios({ slug, premios, puntos, hayCanjePendiente, alToque, termino }: Props) {
  const alcanzaAlguno = premios.some((p) => puntos >= p.puntos_necesarios);
  return (
    <section className="mt-8">
      <h2 className="titulo-seccion">Premios</h2>
      {alcanzaAlguno && !hayCanjePendiente && (
        alToque ? (
          <p className="mt-3 flex items-center gap-2.5 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-sm">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
            </span>
            Estás en el local: tocá Canjear y listo.
          </p>
        ) : (
          <p className="mt-3 rounded-2xl bg-stone-900/[0.05] px-4 py-3 text-sm text-stone-600">
            Para canjear, pedile al {termino} que apoye su llavero y después tocá <strong className="text-stone-900">Canjear</strong> en esta misma pantalla.
          </p>
        )
      )}
      <ul className="superficie mt-3 divide-y divide-stone-900/[0.06] overflow-hidden">
        {premios.map((p) => {
          const alcanza = puntos >= p.puntos_necesarios;
          const faltan = p.puntos_necesarios - puntos;
          return (
            <li key={p.id} className="flex items-center gap-3.5 px-4 py-3.5">
              <Anillo progreso={Math.min(1, puntos / p.puntos_necesarios)} alcanza={alcanza} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold tracking-tight text-stone-900">{p.nombre}</p>
                <p className="text-[13px] text-stone-500">
                  {p.puntos_necesarios} puntos
                  {!alcanza && <span> · te {faltan === 1 ? "falta 1" : `faltan ${faltan}`}</span>}
                </p>
              </div>
              {alcanza && <BotonCanjear slug={slug} premioId={p.id} deshabilitado={hayCanjePendiente} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Anillo({ progreso, alcanza }: { progreso: number; alcanza: boolean }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-11 w-11 shrink-0">
      <svg viewBox="0 0 44 44" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgb(0 0 0 / 0.07)" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke={alcanza ? "var(--marca-acento)" : "var(--marca)"}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progreso)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-base" aria-hidden>
        {alcanza ? <Icono nombre="premio" tamaño={18} /> : null}
      </span>
      {!alcanza && (
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums text-stone-600">
          {Math.round(progreso * 100)}%
        </span>
      )}
    </div>
  );
}
