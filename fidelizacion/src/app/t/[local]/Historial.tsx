import { formatearFecha, type Movimiento } from "@/lib/tarjeta";
import { nombreIconoMovimiento, tituloMovimiento } from "@/lib/movimientos";
import { Icono } from "@/components/Icono";

export function Historial({ movimientos, zona }: { movimientos: Movimiento[]; zona: string }) {
  return (
    <section className="mt-8">
      <h2 className="titulo-seccion">Historial</h2>
      {movimientos.length === 0 ? (
        <p className="mt-3 px-1 text-sm text-stone-500">Todavía no hay movimientos.</p>
      ) : (
        <ul className="superficie mt-3 divide-y divide-stone-900/[0.06] overflow-hidden">
          {movimientos.map((m) => {
            const suma = m.tipo !== "canje";
            return (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
                  style={
                    suma
                      ? { background: "color-mix(in oklab, var(--marca-acento) 28%, white)", color: "color-mix(in oklab, var(--marca-acento), black 45%)" }
                      : { background: "color-mix(in oklab, var(--marca) 10%, white)" }
                  }
                  aria-hidden
                >
                  <Icono nombre={nombreIconoMovimiento(m)} tamaño={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-stone-900">{tituloMovimiento(m)}</p>
                  <p className="text-xs text-stone-500">
                    {formatearFecha(m.created_at, zona)}
                    {m.mozo && ` · ${m.mozo}`}
                    {m.origen === "qr" && " · QR"}
                  </p>
                </div>
                <p className={`text-sm font-semibold tabular-nums ${suma ? "text-emerald-700" : "text-stone-500"}`}>
                  {suma ? `+${m.puntos}` : m.puntos}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
