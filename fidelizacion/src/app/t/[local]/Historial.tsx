import { formatearFecha, type Movimiento } from "@/lib/tarjeta";
import { nombreIconoMovimiento, tituloMovimiento } from "@/lib/movimientos";
import { IconoFila, Lista } from "@/components/app/Superficie";
import { EstadoVacio } from "@/components/app/EstadoVacio";
import { BotonLink } from "@/components/app/Boton";

export function Historial({ movimientos, zona, comercio, termino }: { movimientos: Movimiento[]; zona: string; comercio: string; termino: string }) {
  if (movimientos.length === 0) {
    return (
      <EstadoVacio
        comercio={comercio}
        titulo="Todavía no hay movimientos"
        texto={`Pedile al ${termino} que apoye su llavero en tu celular y sumá tu primer punto.`}
        accion={
          <BotonLink href="#tarjeta" variante="secundario">
            Ver mi tarjeta
          </BotonLink>
        }
      />
    );
  }
  return (
    <Lista>
      {movimientos.map((m) => {
        const suma = m.tipo !== "canje";
        return (
          <li key={m.id} className="flex items-center gap-3 px-4 py-3">
            <IconoFila icono={nombreIconoMovimiento(m)} tono={suma ? "acento" : "oscuro"} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium text-pt-ink">{tituloMovimiento(m)}</p>
              <p className="pt-app-detalle text-pt-ink-2">
                {formatearFecha(m.created_at, zona)}
                {m.mozo && ` · ${m.mozo}`}
                {m.origen === "qr" && " · QR"}
              </p>
            </div>
            <p className={`text-[15px] font-semibold tabular-nums ${suma ? "text-pt-accent-ink" : "text-pt-ink-2"}`}>{suma ? `+${m.puntos}` : m.puntos}</p>
          </li>
        );
      })}
    </Lista>
  );
}
