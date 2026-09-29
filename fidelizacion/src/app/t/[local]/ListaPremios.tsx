import type { Premio } from "@/lib/tarjeta";
import { BotonCanjear } from "./BotonCanjear";
import { Icono } from "@/components/Icono";
import { Aviso, Lista } from "@/components/app/Superficie";

/** Premios del local con un anillo de progreso cada uno. */
type Props = {
  slug: string;
  premios: Premio[];
  puntos: number;
  alToque: boolean;
  termino: string;
};

export function ListaPremios({ slug, premios, puntos, alToque, termino }: Props) {
  const alcanzaAlguno = premios.some((p) => puntos >= p.puntos_necesarios);
  return (
    <>
      {alcanzaAlguno && (
        alToque ? (
          <Aviso tono="acento" className="mb-4">
            <span className="flex items-center gap-2.5 font-medium">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full bg-pt-ink/40 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-pt-ink" />
              </span>
              Estás en el local: tocá Canjear y listo.
            </span>
          </Aviso>
        ) : (
          <Aviso tono="suave" icono="nfc" className="mb-4">
            Para canjear, pedile al {termino} que apoye su llavero: el botón <strong className="text-pt-ink">Canjear</strong> aparece acá mismo.
          </Aviso>
        )
      )}
      <Lista>
        {premios.map((p) => {
          const alcanza = puntos >= p.puntos_necesarios;
          const faltan = p.puntos_necesarios - puntos;
          return (
            <li key={p.id} className="flex items-center gap-3.5 px-4 py-3.5">
              <Anillo progreso={Math.min(1, puntos / p.puntos_necesarios)} alcanza={alcanza} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-pt-ink">{p.nombre}</p>
                <p className="pt-app-detalle text-pt-ink-2">
                  {p.puntos_necesarios} puntos
                  {alcanza ? <span className="font-medium text-pt-accent-ink"> · listo para canjear</span> : <span> · te {faltan === 1 ? "falta 1" : `faltan ${faltan}`}</span>}
                </p>
              </div>
              {alcanza && alToque && <BotonCanjear slug={slug} premioId={p.id} />}
            </li>
          );
        })}
      </Lista>
    </>
  );
}

function Anillo({ progreso, alcanza }: { progreso: number; alcanza: boolean }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-11 w-11 shrink-0">
      <svg viewBox="0 0 44 44" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="4" style={{ stroke: "var(--color-pt-surface)" }} />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progreso)}
          style={{ stroke: alcanza ? "var(--color-pt-accent)" : "var(--color-pt-ink)" }}
          className="transition-[stroke-dashoffset] duration-700 ease-[var(--ease-pt)]"
        />
      </svg>
      {alcanza ? (
        <span className="absolute inset-0 flex items-center justify-center text-pt-ink" aria-hidden>
          <Icono nombre="premio" tamaño={18} />
        </span>
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums text-pt-ink-2">
          {Math.round(progreso * 100)}%
        </span>
      )}
    </div>
  );
}
