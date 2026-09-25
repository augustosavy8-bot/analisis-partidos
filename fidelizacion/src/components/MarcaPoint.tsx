/** Marca de la plataforma (Point). Los locales usan su propia marca. */
export const COLORES_POINT = { naranja: "#E6633A", marino: "#0F172A" } as const;

type Tono = "color" | "blanco" | "negro";

/** El punto con ondas NFC. */
export function IsotipoPoint({ tamaño = 40, tono = "color", className = "" }: { tamaño?: number; tono?: Tono; className?: string }) {
  const arco = tono === "color" ? COLORES_POINT.naranja : tono === "blanco" ? "#fff" : "#000";
  const ondas = tono === "color" ? COLORES_POINT.marino : arco;
  return (
    <svg viewBox="-4 46 454 454" width={tamaño} height={tamaño} className={className} aria-hidden>
      <g fill="none" strokeLinecap="round">
        <path d="M126 107 A180 180 0 1 0 372 340" stroke={arco} strokeWidth="56" />
        <path d="M300 90 A168 168 0 0 1 418 208" stroke={ondas} strokeWidth="38" />
        <path d="M295 145 A112 112 0 0 1 364 214" stroke={ondas} strokeWidth="38" />
      </g>
      <circle cx="242" cy="252" r="60" fill={arco} />
    </svg>
  );
}

/** Isotipo + "point" en Poppins. */
export function LogoPoint({ alto = 36, tono = "color" }: { alto?: number; tono?: Tono }) {
  const texto = tono === "color" ? COLORES_POINT.marino : tono === "blanco" ? "#fff" : "#000";
  return (
    <span className="inline-flex items-center" style={{ gap: alto * 0.22 }} aria-label="point">
      <IsotipoPoint tamaño={alto} tono={tono} />
      <span
        className="font-bold leading-none"
        style={{ fontFamily: "var(--font-poppins)", fontSize: alto * 0.9, letterSpacing: "-0.05em", color: texto, marginTop: -alto * 0.06 }}
      >
        point
      </span>
    </span>
  );
}
