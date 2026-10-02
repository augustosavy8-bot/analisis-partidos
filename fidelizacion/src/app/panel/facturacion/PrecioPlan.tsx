import { formatearPesos } from "@/lib/facturacion/dinero";

/** Precio del plan; con promo: cartel, precio de lista tachado y el % de ahorro. */
export function PrecioPlan({ precioCentavos, precioListaCentavos }: { precioCentavos: number; precioListaCentavos?: number | null }) {
  return (
    <span className="flex shrink-0 flex-col items-end tabular-nums text-pt-ink">
      {precioListaCentavos ? (
        <span className="text-[13px] text-pt-ink-3 line-through decoration-red-500/80 decoration-2">{formatearPesos(precioListaCentavos)}</span>
      ) : null}
      <span>
        <strong className="text-[17px]">{formatearPesos(precioCentavos)}</strong>
        <span className="text-[13px] text-pt-ink-2"> / mes</span>
      </span>
    </span>
  );
}

/** Cartel de promo ("Precio de lanzamiento · -13%"). */
export function CartelPromo({ texto, precioCentavos, precioListaCentavos }: { texto?: string | null; precioCentavos: number; precioListaCentavos?: number | null }) {
  if (!precioListaCentavos) return null;
  const ahorro = Math.round((1 - precioCentavos / precioListaCentavos) * 100);
  return (
    <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
      🔥 {texto ?? "Promo"} · -{ahorro}%
    </span>
  );
}
