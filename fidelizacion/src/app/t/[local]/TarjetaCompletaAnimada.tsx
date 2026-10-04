"use client";

import { useEffect, useState } from "react";
import { PointCard } from "@/components/landing/PointCard";
import { Icono } from "@/components/Icono";

type Props = { meta: number; premio: string; comercio: string; logo: string | null };

/**
 * "Completaste tu tarjeta": la propia tarjeta POINT del cliente se completa.
 *  1. Entra con profundidad mostrando que le falta 1 punto.
 *  2. La barra llega al 100% y el número hace pop.
 *  3. Borde verde, barrido de brillo, ondas de luz por detrás y sello ✓.
 * Con "reducir movimiento" se ve directo el estado final.
 */
export function TarjetaCompletaAnimada({ meta, premio, comercio, logo }: Props) {
  const [llena, setLlena] = useState(false);

  useEffect(() => {
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setLlena(true), reducir ? 0 : 700);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative w-[min(84vw,340px)]">
      {/* Ondas de luz detrás de la tarjeta */}
      {llena && (
        <>
          <span className="pt-completa-onda pointer-events-none absolute inset-0 rounded-pt-lg ring-2 ring-pt-accent" aria-hidden />
          <span className="pt-completa-onda pt-completa-onda-2 pointer-events-none absolute inset-0 rounded-pt-lg ring-2 ring-pt-accent" aria-hidden />
        </>
      )}

      <div className="pt-completa-entrada relative rounded-pt-lg shadow-pt-card-app">
        <PointCard
          puntos={llena ? meta : meta - 1}
          meta={meta}
          comercio={comercio}
          inicial={comercio.charAt(0).toUpperCase()}
          logo={logo}
          premio={premio.toLowerCase()}
          destacarUltimo={llena}
          reflejo={false}
        />
        {/* Borde verde al completarse */}
        <span
          className={`pointer-events-none absolute inset-0 rounded-pt-lg ring-2 ring-inset ring-pt-accent transition-opacity duration-500 ${llena ? "opacity-100" : "opacity-0"}`}
          aria-hidden
        />
        {/* Barrido de brillo */}
        {llena && (
          <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-pt-lg" aria-hidden>
            <span className="pt-completa-brillo absolute inset-y-0 -left-1/2 w-1/2" />
          </span>
        )}
        {/* Sello ✓ */}
        {llena && (
          <span
            className="pt-completa-sello absolute -right-6 -top-6 flex h-11 w-11 items-center justify-center rounded-full bg-pt-accent text-pt-sobre-acento shadow-pt-flotante ring-4 ring-pt-card"
            aria-hidden
          >
            <Icono nombre="check" tamaño={22} trazo={2.6} />
          </span>
        )}
      </div>
    </div>
  );
}
