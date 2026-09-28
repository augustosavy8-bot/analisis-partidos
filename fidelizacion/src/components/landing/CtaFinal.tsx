"use client";

import Link from "next/link";
import { useRef } from "react";
import { m, useScroll, useTransform } from "motion/react";
import { PointCard } from "./PointCard";
import { Boton } from "./Boton";
import { Reveal } from "./Reveal";
import { linkWhatsappPoint } from "./contacto";

/** 16 — CTA final: la tarjeta que abrió la landing también la cierra. */
export function CtaFinal() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const rotateY = useTransform(scrollYProgress, [0, 1], [-10, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [80, 0]);

  return (
    <section ref={ref} className="relative flex min-h-[86vh] flex-col items-center overflow-hidden bg-pt-pure px-5 pt-28 text-center md:pt-40">
      <Reveal as="h2" className="pt-display-xl max-w-[900px] text-pt-ink">
        Convertí una compra
        <br />
        en la próxima.
      </Reveal>
      <Reveal orden={1} className="mt-10 flex flex-col items-center gap-4">
        <Boton href={linkWhatsappPoint()} externo variante="oscuro" className="!h-14 !px-8 !text-[16px]">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3a.4.4 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.7-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.3-.2-.5-.3Z" />
          </svg>
          Crear mi programa
        </Boton>
        <p className="pt-ui text-pt-ink-3">Sin app para tus clientes.</p>
        <Link href="/sumate" className="pt-ui text-pt-ink-2 underline decoration-pt-border underline-offset-4 hover:text-pt-ink">
          Prefiero dejar mis datos
        </Link>
      </Reveal>

      {/* La tarjeta, parcialmente recortada por el borde inferior */}
      <div className="pointer-events-none mt-16 w-[88vw] max-w-[620px] translate-y-[28%] [perspective:1400px] md:mt-20">
        <m.div style={{ rotateY, y }} className="rounded-pt-lg shadow-pt-card">
          <PointCard puntos={9} reflejo={false} />
        </m.div>
      </div>
    </section>
  );
}
