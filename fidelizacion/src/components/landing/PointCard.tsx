/**
 * La tarjeta POINT (objeto protagonista). Sólo visual: la luz, el tilt y las
 * animaciones las agregan PointCard3D y NfcTapAnimation.
 * Todo escala con el ancho de la tarjeta (unidades de contenedor, cqw).
 */
export type PointCardProps = {
  puntos?: number;
  meta?: number;
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
}: PointCardProps) {
  const faltan = Math.max(0, meta - puntos);
  return (
    <div
      className={`@container relative aspect-[1.586/1] w-full overflow-hidden rounded-pt-lg text-left text-white ${className}`}
      style={{ background: "radial-gradient(circle at 20% 0%, rgba(54,212,119,.16), transparent 42%), #161916" }}
      role="img"
      aria-label={`Tarjeta POINT de ${comercio}: ${puntos} de ${meta} puntos`}
    >
      {/* 1. Highlight superior muy suave */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.07),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/15" />
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
            <span
              className="flex items-center justify-center rounded-full bg-white/10 font-[family-name:var(--font-manrope)] font-bold ring-1 ring-white/15"
              style={{ width: "7.4cqw", height: "7.4cqw", fontSize: "3.4cqw" }}
            >
              {inicial}
            </span>
            <span className="font-medium text-white/85" style={{ fontSize: "3cqw" }}>
              {comercio}
            </span>
          </div>
          <span className="font-[family-name:var(--font-manrope)] font-bold tracking-[0.2em] text-white/45" style={{ fontSize: "2.2cqw" }}>
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
            <span className="tracking-[-0.02em] text-white/70" style={{ fontSize: "4.4cqw" }}>
              puntos
            </span>
          </p>
          <p className="text-white/55" style={{ fontSize: "2.9cqw", marginTop: "1.4cqw" }}>
            {faltan > 0 ? `${faltan} ${faltan === 1 ? "punto" : "puntos"} para ${premio}` : `¡Ya podés canjear ${premio}!`}
          </p>
        </div>

        {/* Inferior: progreso */}
        {variante === "barra" ? (
          <div className="flex items-center" style={{ gap: "3cqw" }}>
            <div className="relative flex-1 overflow-hidden rounded-full bg-white/[0.12]" style={{ height: "max(6px, 1.1cqw)" }}>
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-pt-accent transition-[width] duration-500 ease-[var(--ease-pt)]"
                style={{ width: `${Math.min(1, puntos / meta) * 100}%` }}
              />
            </div>
            <span className="font-medium tabular-nums text-white/60" style={{ fontSize: "2.6cqw" }}>
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
  apagado = "rgba(255,255,255,.14)",
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
            style={{ width: tamaño, height: tamaño, background: lleno ? "#36D477" : apagado }}
          />
        );
      })}
    </div>
  );
}
