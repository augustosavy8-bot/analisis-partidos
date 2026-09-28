import { MESES } from "@/lib/promos";
import { claseInput } from "@/components/app/Campos";

/** Día y mes del cumple (sin año). */
export function SelectorCumple({ dia, mes, requerido }: { dia?: string; mes?: string; requerido?: boolean }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-2">
      <select name="cumple_dia" defaultValue={dia ?? ""} required={requerido} aria-label="Día" className={claseInput}>
        <option value="">Día</option>
        {Array.from({ length: 31 }, (_, i) => (
          <option key={i} value={i + 1}>
            {i + 1}
          </option>
        ))}
      </select>
      <select name="cumple_mes" defaultValue={mes ?? ""} required={requerido} aria-label="Mes" className={claseInput}>
        <option value="">Mes</option>
        {MESES.map((m, i) => (
          <option key={m} value={i + 1}>
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}
