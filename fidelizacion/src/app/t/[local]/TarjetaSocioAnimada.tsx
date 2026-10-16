"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { PointCard } from "@/components/landing/PointCard";
import { INSIGNIA_SOCIO } from "@/lib/socios";

type Props = {
  comercio: string;
  logo: string | null;
  puntos: number;
  meta: number | null;
  /** Próximo premio, en minúscula (como en la tarjeta). */
  premio?: string;
  /** Variables --pt-tarjeta-* con los colores del club (lib/socios). */
  vars: Record<string, string>;
};

/**
 * "Ya sos socio": la tarjeta de siempre entra, gira y del otro lado aparece la de
 * socio (colores del club e insignia), con ondas y un barrido de brillo.
 * Con "reducir movimiento" se ve directo la tarjeta de socio.
 */
export function TarjetaSocioAnimada({ comercio, logo, puntos, meta, premio, vars }: Props) {
  const [socia, setSocia] = useState(false);

  useEffect(() => {
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setSocia(true), reducir ? 0 : 750);
    return () => clearTimeout(t);
  }, []);

  const tarjeta = { comercio, logo, puntos, meta, premio, inicial: comercio.charAt(0).toUpperCase(), reflejo: false };
  return (
    <div className="relative w-[min(84vw,340px)]">
      {/* Ondas de luz con el acento del club, cuando ya giró */}
      {socia && (
        <span className="pointer-events-none absolute inset-0" style={vars as CSSProperties} aria-hidden>
          <span className="pt-socio-onda absolute inset-0 rounded-pt-lg" />
          <span className="pt-socio-onda pt-socio-onda-2 absolute inset-0 rounded-pt-lg" />
        </span>
      )}

      <div className="pt-completa-entrada relative [perspective:1200px]">
        <div className={`pt-socio-giro relative ${socia ? "pt-socio-girada" : ""}`}>
          {/* Frente: la tarjeta de siempre (colores del local) */}
          <div className="pt-cara rounded-pt-lg shadow-pt-card-app">
            <PointCard {...tarjeta} />
          </div>
          {/* Dorso: la de socio */}
          <div className="pt-cara pt-cara-dorso absolute inset-0 overflow-hidden rounded-pt-lg shadow-pt-card-app" style={vars as CSSProperties}>
            <PointCard {...tarjeta} socio={INSIGNIA_SOCIO} />
            {socia && <span className="pt-socio-brillo pointer-events-none absolute inset-y-0 -left-1/2 w-1/2" aria-hidden />}
          </div>
        </div>
      </div>
    </div>
  );
}
