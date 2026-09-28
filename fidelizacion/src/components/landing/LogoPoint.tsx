/** Logo de la landing: el isotipo de Point en monocromo + POINT en Manrope. */
export function LogoPoint({ oscuro = false, alto = 22 }: { oscuro?: boolean; alto?: number }) {
  const color = oscuro ? "#fff" : "#111311";
  return (
    <span className="inline-flex items-center" style={{ gap: alto * 0.35, color }}>
      <svg viewBox="-4 46 454 454" width={alto} height={alto} aria-hidden>
        <g fill="none" strokeLinecap="round" stroke="currentColor">
          <path d="M126 107 A180 180 0 1 0 372 340" strokeWidth="56" />
          <path d="M300 90 A168 168 0 0 1 418 208" strokeWidth="38" stroke="#36D477" />
          <path d="M295 145 A112 112 0 0 1 364 214" strokeWidth="38" stroke="#36D477" />
        </g>
        <circle cx="242" cy="252" r="60" fill="currentColor" />
      </svg>
      <span className="font-[family-name:var(--font-manrope)] font-bold tracking-[0.14em]" style={{ fontSize: alto * 0.72 }}>
        POINT
      </span>
    </span>
  );
}
