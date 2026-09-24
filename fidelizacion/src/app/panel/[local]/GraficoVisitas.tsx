type Punto = { dia: string; visitas: number };

const fmtDia = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("es-AR", { timeZone: "UTC", ...opts }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));

/** Barras de visitas por día (una sola serie, color del local). Hover/tap muestra el valor. */
export function GraficoVisitas({ datos }: { datos: Punto[] }) {
  const max = Math.max(1, ...datos.map((d) => d.visitas));
  const total = datos.reduce((a, d) => a + d.visitas, 0);

  return (
    <figure>
      <figcaption className="flex items-baseline justify-between">
        <span className="font-medium">Visitas por día</span>
        <span className="text-sm text-stone-500">Últimos 14 días · {total} en total</span>
      </figcaption>

      <div className="relative mt-5 h-40" aria-hidden>
        {/* líneas guía recesivas */}
        {[0, 0.5, 1].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-stone-100" style={{ bottom: `${f * 100}%` }} />
        ))}
        <span className="absolute -top-4 right-0 text-[11px] text-stone-400">{max}</span>
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {datos.map((d) => (
            <div
              key={d.dia}
              tabIndex={0}
              className="group relative flex h-full flex-1 items-end outline-none"
            >
              <div
                className="w-full rounded-t-[4px] transition-opacity group-hover:opacity-80 group-focus:opacity-80"
                style={{
                  height: d.visitas ? `${Math.max(3, (d.visitas / max) * 100)}%` : "2px",
                  background: d.visitas ? "var(--marca)" : "#e7e5e4",
                }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block group-focus:block">
                <span className="font-semibold">{d.visitas}</span> {d.visitas === 1 ? "visita" : "visitas"}
                <span className="block text-stone-300">{fmtDia(d.dia, { weekday: "short", day: "numeric", month: "short" })}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-stone-400" aria-hidden>
        <span>{datos[0] && fmtDia(datos[0].dia, { day: "numeric", month: "short" })}</span>
        <span>Hoy</span>
      </div>

      {/* Versión accesible en tabla */}
      <table className="sr-only">
        <caption>Visitas por día, últimos 14 días</caption>
        <thead>
          <tr>
            <th>Día</th>
            <th>Visitas</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((d) => (
            <tr key={d.dia}>
              <td>{fmtDia(d.dia, { day: "numeric", month: "long" })}</td>
              <td>{d.visitas}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
