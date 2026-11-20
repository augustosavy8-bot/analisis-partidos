/** Mientras carga una sección del admin: se ve al instante al tocar la barra. */
export default function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando" className="animate-pulse">
      <div className="h-8 w-40 rounded-lg bg-stone-200" />
      <div className="mt-2 h-4 w-64 max-w-full rounded bg-stone-200" />
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-stone-200" />
        ))}
      </div>
      <div className="mt-4 h-64 w-full rounded-xl bg-stone-200" />
    </div>
  );
}
