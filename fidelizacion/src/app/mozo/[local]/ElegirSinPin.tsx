import { entrarDesdePanel } from "./actions";

type Mozo = { id: string; nombre: string };

/** Con el panel abierto no hace falta PIN: se elige quién atiende (para las stats) y listo. */
export function ElegirSinPin({ slug, mozos }: { slug: string; mozos: Mozo[] }) {
  if (!mozos.length) {
    return (
      <p className="pt-app-texto text-pt-ink-2">
        Primero creá al menos una persona del equipo en el panel (Más → Equipo), por ejemplo “Caja”.
      </p>
    );
  }
  return (
    <div>
      <p className="text-[13px] font-medium text-pt-ink">¿Quién atiende?</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {mozos.map((m) => (
          <form key={m.id} action={entrarDesdePanel.bind(null, slug, m.id)}>
            <button
              type="submit"
              className="h-pt-control w-full rounded-pt-sm bg-pt-pure px-4 text-left text-[15px] font-semibold text-pt-ink ring-1 ring-inset ring-pt-border transition-[transform] duration-150 hover:ring-pt-ink-3 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pt-accent-dark"
            >
              {m.nombre}
            </button>
          </form>
        ))}
      </div>
      <p className="mt-3 pt-app-detalle text-pt-ink-2">Entraste con tu cuenta del panel: no hace falta PIN.</p>
    </div>
  );
}
