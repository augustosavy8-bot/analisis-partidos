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

