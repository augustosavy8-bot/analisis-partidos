import { Icono, type NombreIcono } from "@/components/Icono";

/** Encabezado de pantalla: el único lugar con título grande. */
export function Encabezado({
  titulo,
  sobre,
  detalle,
  accion,
}: {
  titulo: React.ReactNode;
  /** Línea chica arriba del título (ej. "Hola,"). */
  sobre?: React.ReactNode;
  detalle?: React.ReactNode;
  accion?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {sobre && <p className="pt-app-detalle font-medium text-pt-ink-2">{sobre}</p>}
        <h1 className="pt-app-titulo truncate text-pt-ink">{titulo}</h1>
        {detalle && <p className="pt-app-detalle mt-1 text-pt-ink-2">{detalle}</p>}
      </div>
      {accion && <div className="shrink-0">{accion}</div>}
    </header>
  );
}

/** Bloque con título chico (no grande: los títulos grandes van sólo en el encabezado). */
export function Seccion({
  titulo,
  detalle,
  accion,
  children,
  className = "",
}: {
  titulo?: React.ReactNode;
  detalle?: React.ReactNode;
  accion?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`mt-7 first:mt-0 ${className}`}>
      {(titulo || accion) && (
        <div className="mb-2.5 flex items-end justify-between gap-3 px-1">
          <div>
            {titulo && <h2 className="pt-app-seccion text-pt-ink">{titulo}</h2>}
            {detalle && <p className="pt-app-detalle text-pt-ink-2">{detalle}</p>}
          </div>
          {accion}
        </div>
      )}
      {children}
    </section>
  );
}

/** Superficie blanca con la sombra de UI de la landing. */
export function Superficie({ children, className = "", as: Tag = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "section" | "ul" | "form" }) {
  return <Tag className={`rounded-pt-card bg-pt-pure shadow-pt-ui ring-1 ring-pt-border/60 ${className}`}>{children}</Tag>;
}

/** Lista dentro de una superficie, con separadores de 1px. */
export function Lista({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <ul className={`divide-y divide-pt-border overflow-hidden rounded-pt-card bg-pt-pure shadow-pt-ui ring-1 ring-pt-border/60 ${className}`}>{children}</ul>;
}

/** Círculo con ícono para filas de lista. */
export function IconoFila({ icono, tono = "neutro" }: { icono: NombreIcono; tono?: "neutro" | "acento" | "oscuro" }) {
  const tonos = {
    neutro: "bg-pt-surface text-pt-ink",
    acento: "bg-pt-accent-soft text-pt-accent-ink",
    oscuro: "bg-pt-ink text-white",
  };
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tonos[tono]}`} aria-hidden>
      <Icono nombre={icono} tamaño={18} />
    </span>
  );
}

/** Etiqueta chica de estado. */
export function Insignia({ children, tono = "neutro" }: { children: React.ReactNode; tono?: "neutro" | "acento" | "aviso" | "error" }) {
  const tonos = {
    neutro: "bg-pt-surface text-pt-ink-2",
    acento: "bg-pt-accent-soft text-pt-accent-ink",
    aviso: "bg-pt-warning-soft text-pt-warning-ink",
    error: "bg-pt-error-soft text-pt-error-ink",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${tonos[tono]}`}>{children}</span>;
}

/** Aviso en línea (no bloqueante). */
export function Aviso({ children, icono, tono = "oscuro", className = "" }: { children: React.ReactNode; icono?: NombreIcono; tono?: "oscuro" | "acento" | "suave"; className?: string }) {
  const tonos = {
    oscuro: "bg-pt-ink text-white",
    acento: "bg-pt-accent text-pt-sobre-acento",
    suave: "bg-pt-surface text-pt-ink-2",
  };
  return (
    <div className={`pt-subir flex items-center gap-3 rounded-pt-card px-4 py-3 pt-app-detalle ${tonos[tono]} ${className}`}>
      {icono && <Icono nombre={icono} tamaño={20} className="shrink-0" />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Placeholder de carga (pulso sólo si el usuario no pidió reducir movimiento). */
export function Esqueleto({ className = "" }: { className?: string }) {
  return <div className={`rounded-pt-sm bg-pt-surface motion-safe:animate-pulse ${className}`} aria-hidden />;
}
