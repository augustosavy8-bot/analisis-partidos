/**
 * La tarjeta POINT (objeto protagonista). Sólo visual: la luz, el tilt y las
 * animaciones las agregan PointCard3D y NfcTapAnimation.
 * Todo escala con el ancho de la tarjeta (unidades de contenedor, cqw).
 */
/** Acento de la tarjeta: el del bar si hay tema, el verde de Point si no. */
const ACENTO = "var(--pt-tarjeta-acento, #36d477)";

export type PointCardProps = {
  puntos?: number;
  /** Puntos del próximo premio. null = el local todavía no tiene premios (sin progreso). */
  meta?: number | null;
  comercio?: string;
  inicial?: string;
  premio?: string;
  /** Resalta el último punto (animación "pop" del séptimo punto). */
  destacarUltimo?: boolean;
  /** Muestra puntos (● ○) en lugar de la barra. */
  variante?: "barra" | "puntos";
  className?: string;
  /** Capa de reflejo: el padre controla --glare-x / --glare-y. */
  reflejo?: boolean;
  /** Logo del local (reemplaza la inicial). */
  logo?: string | null;
  /** Texto debajo del número (reemplaza "N puntos para …"). */
  leyenda?: string;
};

export function PointCard({
  puntos = 7,
  meta = 10,
  comercio = "Café Aurora",
  inicial = "A",
  premio = "tu próximo café",
  destacarUltimo = false,
  variante = "barra",
  className = "",
  reflejo = true,
  logo,
  leyenda,
}: PointCardProps) {
  const faltan = meta == null ? 0 : Math.max(0, meta - puntos);
  const texto =
    leyenda ??
    (meta == null ? "Sumá en cada visita" : faltan > 0 ? `${faltan} ${faltan === 1 ? "punto" : "puntos"} para ${premio}` : `¡Ya podés canjear ${premio}!`);
  return (
    <div
      className={`@container relative aspect-[1.586/1] w-full overflow-hidden rounded-pt-lg text-left ${className}`}
      // Colores de Point por defecto; en la app del cliente, los del bar (variables --pt-tarjeta-*, ver lib/tema).
      style={{
        background: `radial-gradient(circle at 20% 0%, color-mix(in srgb, ${ACENTO} 16%, transparent), transparent 42%), var(--pt-tarjeta-fondo, #161916)`,
        color: "var(--pt-tarjeta-texto, #ffffff)",
      }}
      role="img"
      aria-label={`Tarjeta POINT de ${comercio}: ${puntos} ${meta == null ? "puntos" : `de ${meta} puntos`}`}
    >
      {/* 1. Highlight superior muy suave */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.07),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-current/15" />
      {/* Grano microscópico */}
      <div className="pt-grano pointer-events-none absolute inset-0" />
      {/* 2. Reflejo diagonal que responde al mouse */}
      {reflejo && (
        <div
          className="pointer-events-none absolute -inset-1/2 transition-transform duration-300 ease-out"
          style={{
            background: "linear-gradient(115deg, transparent 40%, rgba(255,255,255,.075) 48%, rgba(255,255,255,.02) 54%, transparent 60%)",
            transform: "translate3d(var(--glare-x, 0%), var(--glare-y, 0%), 0)",
          }}
        />
      )}

      <div className="relative flex h-full flex-col justify-between" style={{ padding: "6.5cqw" }}>
        {/* Superior: comercio · POINT */}
        <div className="flex items-start justify-between">
          <div className="flex items-center" style={{ gap: "2.2cqw" }}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="rounded-full object-cover ring-1 ring-current/15" style={{ width: "7.4cqw", height: "7.4cqw" }} />
            ) : (
              <span
                className="flex items-center justify-center rounded-full bg-current/10 font-[family-name:var(--font-manrope)] font-bold ring-1 ring-current/15"
                style={{ width: "7.4cqw", height: "7.4cqw", fontSize: "3.4cqw" }}
              >
                {inicial}
              </span>
            )}
            <span className="font-medium text-current/85" style={{ fontSize: "3cqw" }}>
              {comercio}
            </span>
          </div>
          <span className="font-[family-name:var(--font-manrope)] font-bold tracking-[0.2em] text-current/45" style={{ fontSize: "2.2cqw" }}>
            POINT
          </span>
        </div>

        {/* Centro: el número domina */}
        <div>
          <p className="flex items-baseline font-[family-name:var(--font-manrope)] font-semibold tracking-[-0.04em]" style={{ gap: "2cqw" }}>
            <span
              key={destacarUltimo ? `pop-${puntos}` : "fijo"}
              className={`inline-block origin-bottom-left tabular-nums leading-[0.85] ${destacarUltimo ? "pt-pop" : ""}`}
              style={{ fontSize: "21cqw" }}
            >
              {puntos}
            </span>
            <span className="tracking-[-0.02em] text-current/70" style={{ fontSize: "4.4cqw" }}>
              {puntos === 1 ? "punto" : "puntos"}
            </span>
          </p>
          <p className="text-current/55" style={{ fontSize: "2.9cqw", marginTop: "1.4cqw" }}>
            {texto}
          </p>
        </div>

        {/* Inferior: progreso */}
        {meta == null ? (
          <span />
        ) : variante === "barra" ? (
          <div className="flex items-center" style={{ gap: "3cqw" }}>
            <div className="relative flex-1 overflow-hidden rounded-full bg-current/[0.12]" style={{ height: "max(6px, 1.1cqw)" }}>
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-[var(--ease-pt)]"
                style={{ width: `${Math.min(1, puntos / meta) * 100}%`, background: ACENTO }}
              />
            </div>
            <span className="font-medium tabular-nums text-current/60" style={{ fontSize: "2.6cqw" }}>
              {Math.min(puntos, meta)} / {meta}
            </span>
          </div>
        ) : (
          <FilaPuntos puntos={puntos} meta={meta} destacarUltimo={destacarUltimo} />
        )}
      </div>
    </div>
  );
}

/** ● ● ● ● ● ● ● ○ ○ ○ */
export function FilaPuntos({
  puntos,
  meta,
  destacarUltimo,
  tamaño = "2.6cqw",
  apagado = "color-mix(in srgb, currentColor 14%, transparent)",
}: {
  puntos: number;
  meta: number;
  destacarUltimo?: boolean;
  tamaño?: string;
  apagado?: string;
}) {
  return (
    <div className="flex items-center" style={{ gap: `calc(${tamaño} * 0.7)` }}>
      {Array.from({ length: meta }, (_, i) => {
        const lleno = i < puntos;
        const ultimo = destacarUltimo && i === puntos - 1;
        return (
          <span
            key={i}
            className={`rounded-full ${ultimo ? "pt-pop" : ""}`}
            style={{ width: tamaño, height: tamaño, background: lleno ? ACENTO : apagado }}
          />
        );
      })}
    </div>
  );
}
