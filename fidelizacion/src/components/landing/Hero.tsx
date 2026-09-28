"use client";

import { useRef } from "react";
import { Boton } from "./Boton";
import { PointCard3D } from "./PointCard3D";
import { linkWhatsappPoint } from "./contacto";

const retraso = (i: number) => ({ animationDelay: `${i * 80}ms` });

/** 01 — Hero: una idea, mucho aire, la tarjeta como objeto dominante. */
export function Hero() {
  const ref = useRef<HTMLElement>(null);
  return (
    <section ref={ref} className="relative overflow-hidden bg-pt-bg pt-28 md:pt-36 lg:pt-40">
      <div className="mx-auto flex max-w-[1280px] flex-col items-center px-5 text-center md:px-8">
        {/* El título se pinta de entrada (es el LCP): sin animación de aparición. */}
        <h1 className="pt-display-xl max-w-[900px] text-pt-ink">
          Fidelizá clientes.
          <br />
          <span className="md:hidden">Sin una app.</span>
          <span className="hidden md:inline">Sin pedirles una app.</span>
        </h1>
        <p className="pt-entrada pt-lead mt-6 max-w-[560px] text-pt-ink-2" style={retraso(1)}>
          POINT convierte cada compra en una razón para volver.
        </p>
        <div className="pt-entrada mt-9 flex flex-wrap justify-center gap-3" style={retraso(2)}>
          <Boton href={linkWhatsappPoint()} externo etiqueta="Empezar: escribinos por WhatsApp">
            Empezar
          </Boton>
          <Boton href="#como-funciona" variante="secundario">
            Ver cómo
          </Boton>
        </div>
        <p className="pt-entrada pt-ui mt-6 text-pt-ink-3" style={retraso(3)}>
          Funciona con Apple Wallet y Google Wallet.
        </p>

        {/* La tarjeta ocupa ~40% inferior del viewport */}
        <div className="pt-entrada-objeto mt-14 w-[88vw] max-w-[540px] pb-24 [perspective:1400px] md:mt-20 md:pb-32">
          <PointCard3D scrollRef={ref} />
        </div>
      </div>
    </section>
  );
}
