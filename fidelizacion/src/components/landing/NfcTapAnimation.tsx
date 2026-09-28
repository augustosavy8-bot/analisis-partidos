"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m, useInView } from "motion/react";
import { IPhoneMockup } from "./IPhoneMockup";
import { WalletScreen } from "./WalletScreen";
import { PointCard } from "./PointCard";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Fases de la secuencia (2,2 s):
 *  1  0–400    el llavero POINT se acerca (x 20→0, rotate -4→0)
 *  2  400–750  contacto: tres ondas NFC (1.4 / 1.8 / 2.2, separadas 90ms)
 *  3  650–1100 la tarjeta aparece en Wallet (scale .94→1, y 14→0)
 *  4  1100–1500 la barra pasa de 6/10 a 7/10 y el 7 hace "pop"
 *  5  1500–2200 estado final: "Punto agregado"
 */
const INICIO = [0, 0, 400, 650, 1100, 1500];
const DURACION = 2200;
const PAUSA = 1800;

export type PasoNfc = 0 | 1 | 2;

export function NfcTapAnimation({
  paso,
  loop = false,
  className = "",
}: {
  /** Controlado por scroll: 0 Acercá · 1 Sumá · 2 Volvé. Si no se pasa, corre solo al entrar en pantalla. */
  paso?: PasoNfc;
  loop?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { amount: 0.45 });
  const [fase, setFase] = useState(0);
  const [ciclo, setCiclo] = useState(0);
  const faseRef = useRef(0);
  useEffect(() => {
    faseRef.current = fase;
  }, [fase]);

  // Modo automático: se dispara al entrar en viewport (y repite con pausa si loop).
  useEffect(() => {
    if (paso !== undefined || !visible) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const correr = () => {
      setCiclo((c) => c + 1);
      INICIO.forEach((t, f) => f > 0 && timers.push(setTimeout(() => setFase(f), t)));
      if (loop) {
        timers.push(setTimeout(() => setFase(0), DURACION + PAUSA));
        timers.push(setTimeout(correr, DURACION + PAUSA + 60));
      }
    };
    timers.push(
      setTimeout(() => {
        setFase(0);
        correr();
      }, 60),
    );
    return () => timers.forEach(clearTimeout);
  }, [paso, visible, loop]);

  // Modo controlado: avanza con los tiempos reales o vuelve directo.
  useEffect(() => {
    if (paso === undefined) return;
    const objetivo = paso === 0 ? 1 : paso === 1 ? 3 : 5;
    const actual = faseRef.current;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (objetivo <= actual) {
      timers.push(setTimeout(() => setFase(objetivo), 0));
      return () => timers.forEach(clearTimeout);
    }
    if (actual < 2 && objetivo >= 2) timers.push(setTimeout(() => setCiclo((c) => c + 1), 0));
    for (let f = actual + 1; f <= objetivo; f++) {
      timers.push(setTimeout(() => setFase(f), Math.max(0, INICIO[f] - INICIO[Math.max(1, actual)])));
    }
    return () => timers.forEach(clearTimeout);
  }, [paso]);

  const puntos = fase >= 4 ? 7 : 6;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <IPhoneMockup>
        <WalletScreen
          pie={
            <AnimatePresence>
              {fase >= 5 && (
                <m.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="flex items-center justify-center gap-[2cqw] font-medium text-pt-ink-2"
                  style={{ fontSize: "3.6cqw" }}
                >
                  <span className="flex items-center justify-center rounded-full bg-pt-accent text-pt-ink" style={{ width: "4.6cqw", height: "4.6cqw" }}>
                    <svg viewBox="0 0 24 24" style={{ width: "62%" }} fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                  </span>
                  Punto agregado
                </m.p>
              )}
            </AnimatePresence>
          }
        >
          <m.div
            initial={false}
            animate={fase >= 3 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.94, y: 14 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="rounded-pt-lg shadow-pt-product"
          >
            <PointCard puntos={puntos} destacarUltimo={fase >= 4} reflejo={false} />
          </m.div>
        </WalletScreen>
      </IPhoneMockup>

      {/* Ondas NFC desde el punto de contacto (borde derecho del teléfono) */}
      <div className="pointer-events-none absolute right-0 top-[31%] h-0 w-0">
        {fase >= 2 &&
          [1.4, 1.8, 2.2].map((escala, i) => (
            <m.span
              key={`${ciclo}-${i}`}
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{ scale: escala, opacity: 0 }}
              transition={{ duration: 0.6, delay: i * 0.09, ease: "easeOut" }}
              className="absolute -left-[60px] -top-[60px] h-[120px] w-[120px] rounded-full border-2 border-pt-accent"
            />
          ))}
      </div>

      {/* Llavero POINT que se acerca */}
      <m.div
        initial={false}
        animate={fase >= 1 ? { x: 0, rotate: 0, opacity: 1 } : { x: 20, rotate: -4, opacity: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="absolute -right-[16%] top-[24%] w-[30%]"
      >
        <Llavero />
      </m.div>
    </div>
  );
}

/** El tag/llavero POINT. */
function Llavero() {
  return (
    <div className="relative">
      <div className="mx-auto h-[10%] w-[34%] rounded-t-full border-[3px] border-b-0 border-[#9ca3a0]" style={{ aspectRatio: "2/1" }} />
      <div
        className="relative flex aspect-[1/1.2] flex-col items-center justify-center gap-[8%] rounded-[26%] shadow-pt-product"
        style={{ background: "radial-gradient(circle at 30% 0%, rgba(54,212,119,.22), transparent 55%), #161916" }}
      >
        <span className="absolute left-1/2 top-[8%] h-[8%] w-[8%] -translate-x-1/2 rounded-full bg-pt-bg" />
        <svg viewBox="-4 46 454 454" className="w-[46%]" aria-hidden>
          <g fill="none" strokeLinecap="round">
            <path d="M126 107 A180 180 0 1 0 372 340" strokeWidth="56" stroke="#fff" />
            <path d="M300 90 A168 168 0 0 1 418 208" strokeWidth="38" stroke="#36D477" />
            <path d="M295 145 A112 112 0 0 1 364 214" strokeWidth="38" stroke="#36D477" />
          </g>
          <circle cx="242" cy="252" r="60" fill="#fff" />
        </svg>
        <span className="font-[family-name:var(--font-manrope)] text-[9px] font-bold tracking-[0.2em] text-white/60">POINT</span>
      </div>
    </div>
  );
}
