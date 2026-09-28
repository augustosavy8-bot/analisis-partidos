/** Tarjeta de sellos con el isotipo de Point: llenos en verde, vacíos en gris. */
export function SellosPoint({ puntos, meta }: { puntos: number; meta: number }) {
  return (
    <div className="grid w-full max-w-[360px] grid-cols-5 gap-x-[4%] gap-y-4">
      {Array.from({ length: meta }, (_, i) => (
        <SelloPoint key={i} lleno={i < puntos} ultimo={i === puntos - 1} />
      ))}
    </div>
  );
}

function SelloPoint({ lleno, ultimo }: { lleno: boolean; ultimo: boolean }) {
  const aro = lleno ? "#20B85E" : "#E2E5E0";
  const onda = lleno ? "#36D477" : "#E2E5E0";
  return (
    <svg viewBox="-4 46 454 454" className={`aspect-square w-full ${ultimo ? "pt-pop" : ""}`} aria-hidden>
      <g fill="none" strokeLinecap="round">
        <path d="M126 107 A180 180 0 1 0 372 340" strokeWidth="56" style={{ stroke: aro }} />
        <path d="M300 90 A168 168 0 0 1 418 208" strokeWidth="38" style={{ stroke: onda }} />
        <path d="M295 145 A112 112 0 0 1 364 214" strokeWidth="38" style={{ stroke: onda }} />
      </g>
      <circle cx="242" cy="252" r="60" style={{ fill: aro }} />
    </svg>
  );
}
