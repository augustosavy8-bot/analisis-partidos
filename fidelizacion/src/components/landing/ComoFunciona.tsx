"use client";

import { useRef, useState } from "react";
import { m, useMotionValueEvent, useScroll } from "motion/react";
import { NfcTapAnimation, type PasoNfc } from "./NfcTapAnimation";
import { Etiqueta } from "./Section";
import { Reveal } from "./Reveal";

const PASOS = [
  { n: "01", titulo: "Acercá", texto: "Tu equipo acerca el llavero POINT al celular del cliente. No hay que escanear nada ni abrir ninguna app." },
  { n: "02", titulo: "Sumá", texto: "Un tap y listo: la tarjeta del comercio aparece en la Wallet con el punto sumado." },
  { n: "03", titulo: "Volvé", texto: "El cliente ve cuánto le falta para su premio, siempre a mano en el teléfono. Y vuelve." },
];

/** 12 — Cómo funciona: "Un tap. Un punto." Desktop: sticky ~250vh guiado por el scroll. */
export function ComoFunciona() {
  return (
    <section id="como-funciona" className="relative scroll-mt-16 bg-pt-pure">
      <Escritorio />
      <Movil />
    </section>
  );
}

function Encabezado() {
  return (
    <>
      <Etiqueta>Cómo funciona</Etiqueta>
      <h2 className="pt-display mt-4 text-pt-ink">Un tap. Un punto.</h2>
      <p className="pt-lead mt-3 text-pt-ink-2">Eso es todo.</p>
    </>
  );
}

function Escritorio() {
  const ref = useRef<HTMLDivElement>(null);
  const [paso, setPaso] = useState<PasoNfc>(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const p = (v < 0.3 ? 0 : v < 0.62 ? 1 : 2) as PasoNfc;
    setPaso((a) => (a === p ? a : p));
  });

  return (
    <div ref={ref} className="relative hidden h-[250vh] lg:block">
      <div className="sticky top-0 flex h-screen items-center">
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-[1fr_1fr] items-center gap-16 px-8">
          <div>
            <Encabezado />
            <ol className="mt-14 space-y-2">
              {PASOS.map((p, i) => {
                const activo = i === paso;
                return (
                  <li key={p.n}>
                    <m.div
                      animate={{ opacity: activo ? 1 : 0.35 }}
                      transition={{ duration: 0.28 }}
                      className="border-l-2 py-4 pl-6"
                      style={{ borderColor: activo ? "var(--accent)" : "var(--border)" }}
                    >
                      <p className="pt-label text-pt-ink-3">{p.n}</p>
                      <p className="pt-h3 mt-1 text-pt-ink">{p.titulo}</p>
                      <m.p
                        initial={false}
                        animate={{ height: activo ? "auto" : 0, opacity: activo ? 1 : 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="pt-body max-w-[420px] overflow-hidden text-pt-ink-2"
                      >
                        <span className="block pt-2">{p.texto}</span>
                      </m.p>
                    </m.div>
                  </li>
                );
              })}
            </ol>
          </div>
          <div className="flex justify-center">
            <NfcTapAnimation paso={paso} className="w-[min(320px,calc((100vh-150px)*0.4615))] pt-8" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Movil() {
  return (
    <div className="mx-auto max-w-[640px] px-5 py-24 md:px-8 md:py-32 lg:hidden">
      <Reveal>
        <Encabezado />
      </Reveal>
      <div className="relative mt-12 flex justify-center">
        <NfcTapAnimation loop className="w-[62vw] max-w-[280px]" />
      </div>
      <ol className="mt-16 space-y-8">
        {PASOS.map((p, i) => (
          <Reveal as="li" key={p.n} orden={i}>
            <p className="pt-label text-pt-ink-3">{p.n}</p>
            <p className="pt-h3 mt-1 text-pt-ink">{p.titulo}</p>
            <p className="pt-body mt-2 text-pt-ink-2">{p.texto}</p>
          </Reveal>
        ))}
      </ol>
    </div>
  );
}
