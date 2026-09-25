/**
 * Animaciones de Point (fase 7), con los colores de cada local.
 * Las keyframes están en globals.css (clases pt-*); respetan "reducir movimiento".
 * Los colores van por style para aceptar variables CSS (var(--marca), etc.).
 */

/** Sello que se estampa (con pulso). */
export function SelloAnimado({ aro, ondas, tamaño = 180, retardo = 0 }: { aro: string; ondas: string; tamaño?: number; retardo?: number }) {
  const o = { transformOrigin: "150px 150px", animationDelay: `${retardo}ms` };
  return (
    <svg viewBox="0 0 300 300" width={tamaño} height={tamaño} className="overflow-visible" aria-hidden>
      <g className="pt-sello" style={o}>
        <circle cx="150" cy="150" r="92" fill="none" strokeWidth="24" style={{ stroke: aro }} />
        <circle cx="150" cy="150" r="42" style={{ fill: aro }} />
        <path d="M202 92a65 65 0 0 1 33 48" fill="none" strokeWidth="16" strokeLinecap="round" style={{ stroke: ondas }} />
        <path d="M221 72a91 91 0 0 1 45 70" fill="none" strokeWidth="16" strokeLinecap="round" style={{ stroke: ondas }} />
      </g>
      <circle className="pt-sello-pulso" style={{ ...o, stroke: aro }} cx="150" cy="150" r="112" fill="none" strokeWidth="8" opacity="0" />
    </svg>
  );
}

/** Ondas NFC que laten: "apoyá el llavero". */
export function OndasNfc({ punto, ondas, tamaño = 120 }: { punto: string; ondas: string; tamaño?: number }) {
  return (
    <svg viewBox="40 40 220 220" width={tamaño} height={tamaño} className="overflow-visible" aria-hidden>
      <circle cx="112" cy="150" r="30" style={{ fill: punto }} />
      <path className="pt-onda" d="M145 112a54 54 0 0 1 0 76" fill="none" strokeWidth="14" strokeLinecap="round" style={{ stroke: ondas }} />
      <path className="pt-onda pt-onda-2" d="M171 88a88 88 0 0 1 0 124" fill="none" strokeWidth="14" strokeLinecap="round" style={{ stroke: ondas }} />
      <path className="pt-onda pt-onda-3" d="M198 63a124 124 0 0 1 0 174" fill="none" strokeWidth="14" strokeLinecap="round" style={{ stroke: ondas }} />
    </svg>
  );
}

/** Aro y tilde que se dibujan: canje confirmado. */
export function CheckCanje({ color = "#16A34A", tamaño = 160 }: { color?: string; tamaño?: number }) {
  return (
    <svg viewBox="0 0 300 300" width={tamaño} height={tamaño} className="overflow-visible" aria-hidden>
      <circle className="pt-check-aro" cx="150" cy="150" r="94" fill="none" strokeWidth="18" transform="rotate(-90 150 150)" style={{ stroke: color }} />
      <path className="pt-check-tilde" d="M99 154l33 34 72-78" fill="none" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: color }} />
    </svg>
  );
}

/**
 * Tarjeta completa: se estampa el último sello y aparece el regalo.
 * Hasta 10 sellos en 2 filas de 5 (como el diseño); el último se reemplaza por el regalo.
 */
export function TarjetaCompleta({ meta, sello, fondo, caja }: { meta: number; sello: string; fondo: string; caja: string }) {
  const m = Math.max(2, Math.min(10, meta));
  const porFila = m <= 5 ? m : 5;
  const filas = Math.ceil(m / porFila);
  const pos = Array.from({ length: m }, (_, i) => {
    const fila = Math.floor(i / porFila);
    const enFila = Math.min(porFila, m - fila * porFila);
    const col = i % porFila;
    return { x: 360 + (col - (enFila - 1) / 2) * 105, y: 180 + (fila - (filas - 1) / 2) * 100 };
  });
  const ultimo = pos[m - 1];
  return (
    <svg viewBox="30 40 660 280" className="w-full max-w-[340px] overflow-visible" aria-hidden>
      <rect x="30" y="40" width="660" height="280" rx="34" style={{ fill: fondo }} />
      <g style={{ fill: sello }}>
        {pos.slice(0, -1).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="34" />
        ))}
      </g>
      <circle className="pt-ultimo" style={{ transformOrigin: `${ultimo.x}px ${ultimo.y}px`, fill: sello }} cx={ultimo.x} cy={ultimo.y} r="34" />
      <g className="pt-regalo" style={{ transformOrigin: `${ultimo.x}px ${ultimo.y - 10}px` }}>
        <rect x={ultimo.x - 70} y={ultimo.y - 55} width="140" height="95" rx="22" style={{ fill: caja }} />
        <path
          d={`M${ultimo.x} ${ultimo.y - 37}c-14-18-34-3-16 13m16-13c14-18 34-3 16 13`}
          fill="none"
          stroke="#fff"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <rect x={ultimo.x - 39} y={ultimo.y - 24} width="78" height="42" rx="6" style={{ fill: sello }} />
        <path d={`M${ultimo.x} ${ultimo.y - 24}v42M${ultimo.x - 39} ${ultimo.y - 5}h78`} stroke="#fff" strokeWidth="6" />
      </g>
      <g className="pt-chispas" style={{ fill: sello }}>
        <circle cx={ultimo.x + 75} cy={ultimo.y - 110} r="5" />
        <circle cx={ultimo.x + 47} cy={ultimo.y - 133} r="4" />
        <circle cx={ultimo.x + 95} cy={ultimo.y - 133} r="4" />
      </g>
    </svg>
  );
}
