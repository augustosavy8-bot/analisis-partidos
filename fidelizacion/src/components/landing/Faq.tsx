"use client";

import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Etiqueta } from "./Section";

const PREGUNTAS = [
  {
    p: "¿Necesito una app?",
    r: "No. Ni vos ni tus clientes. El cliente suma con un tap y su tarjeta se guarda en la Wallet del teléfono. Vos manejás todo desde un panel web.",
  },
  {
    p: "¿Funciona en Android?",
    r: "Sí. Funciona en iPhone y en Android con NFC, que hoy tienen casi todos los teléfonos. Para los que no, hay un QR de respaldo.",
  },
  {
    p: "¿Cómo suma puntos el cliente?",
    r: "Tu equipo acerca el llavero POINT al celular del cliente y el punto se suma al instante. La primera vez sólo deja su nombre y WhatsApp.",
  },
  {
    p: "¿Puedo crear premios?",
    r: "Sí. Definís los premios y cuántos puntos valen, promos de puntos dobles, regalo de bienvenida y de cumpleaños.",
  },
  {
    p: "¿Cuánto cuesta?",
    r: "Depende de la cantidad de locales y llaveros. Escribinos y te armamos una propuesta. [Placeholder: completar con precios]",
  },
];

/** 15 — FAQ: 40/60, acordeón con separadores de 1px, apertura de 300ms. */
export function Faq() {
  const [abierta, setAbierta] = useState<number | null>(0);
  return (
    <section id="preguntas" className="scroll-mt-16 bg-pt-bg">
      <div className="mx-auto grid max-w-[1280px] gap-12 px-5 py-24 md:px-8 md:py-40 lg:grid-cols-[4fr_6fr] lg:gap-16">
        <div>
          <Etiqueta>FAQ</Etiqueta>
          <h2 className="pt-h1 mt-4 text-pt-ink">
            Preguntas
            <br />
            frecuentes.
          </h2>
        </div>
        <div className="border-t border-pt-border">
          {PREGUNTAS.map((q, i) => {
            const abierto = abierta === i;
            return (
              <div key={q.p} className="border-b border-pt-border">
                <button
                  onClick={() => setAbierta(abierto ? null : i)}
                  aria-expanded={abierto}
                  className="flex w-full items-center justify-between gap-6 py-6 text-left"
                >
                  <span className="font-[family-name:var(--font-manrope)] text-[19px] font-semibold tracking-[-0.01em] text-pt-ink md:text-[21px]">
                    {q.p}
                  </span>
                  <span
                    className={`relative h-4 w-4 shrink-0 transition-transform duration-300 ease-[var(--ease-pt)] ${abierto ? "rotate-45" : ""}`}
                    aria-hidden
                  >
                    <span className="absolute left-0 top-1/2 h-[1.5px] w-4 -translate-y-1/2 bg-pt-ink" />
                    <span className="absolute left-1/2 top-0 h-4 w-[1.5px] -translate-x-1/2 bg-pt-ink" />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {abierto && (
                    <m.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="pt-body max-w-[620px] pb-6 text-pt-ink-2">{q.r}</p>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
