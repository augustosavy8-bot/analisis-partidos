import { PointCard } from "@/components/landing/PointCard";

/**
 * Pantalla vacía con intención: una ilustración (por defecto, la tarjeta POINT
 * en cero, un poco inclinada) + texto + un CTA claro.
 */
export function EstadoVacio({
  titulo,
  texto,
  accion,
  ilustracion,
  comercio,
}: {
  titulo: string;
  texto?: React.ReactNode;
  accion?: React.ReactNode;
  ilustracion?: React.ReactNode;
  comercio?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-pt-card border border-dashed border-pt-border bg-pt-pure/60 px-6 py-9 text-center">
      <div className="w-44" aria-hidden>
        {ilustracion ?? (
          <div className="-rotate-6 rounded-pt-lg shadow-pt-card-app">
            <PointCard puntos={0} meta={null} leyenda="Sumá en cada visita" comercio={comercio ?? "Tu local"} inicial={(comercio ?? "T").charAt(0)} reflejo={false} />
          </div>
        )}
      </div>
      <p className="pt-app-seccion mt-7 text-pt-ink">{titulo}</p>
      {texto && <p className="mt-1.5 max-w-xs pt-app-detalle text-pt-ink-2">{texto}</p>}
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  );
}
