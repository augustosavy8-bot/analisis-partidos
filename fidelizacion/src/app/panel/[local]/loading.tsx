import { Esqueleto } from "@/components/app/Superficie";

/** Esqueleto de cualquier sección del panel mientras carga. */
export default function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <Esqueleto className="h-8 w-40" />
      <Esqueleto className="mt-2 h-4 w-64 max-w-full" />
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Esqueleto key={i} className="h-28 !rounded-pt-card" />
        ))}
      </div>
      <Esqueleto className="mt-4 h-64 w-full !rounded-pt-card" />
    </div>
  );
}
