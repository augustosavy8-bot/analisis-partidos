"use client";

import { useEffect, useRef, useState } from "react";
import { m, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { PointCard, type PointCardProps } from "./PointCard";

/**
 * La tarjeta POINT como objeto físico:
 * - Mouse: rotateX ±5°, rotateY ±7° (nunca más) y el reflejo se mueve aparte.
 * - Scroll (dentro de `seguirScroll`): 0° / scale 1 → rotateY -7°, translateY -30px, scale .94.
 * - Sin mouse (touch): sólo una rotación inicial de -3°.
 * - Reducir movimiento: tarjeta quieta.
 * - modo "app": más sutil (±3° / ±4°), sin nada atado al scroll ni rotación inicial.
 */
export function PointCard3D({
  className = "",
  scroll = { rotateY: [0, -7], y: [0, -30], scale: [1, 0.94] },
  scrollRef,
  modo = "hero",
  ...tarjeta
}: PointCardProps & {
  className?: string;
  modo?: "hero" | "app";
  /** Rangos para el efecto de scroll. */
  scroll?: { rotateY: [number, number]; y: [number, number]; scale: [number, number] };
  /** Contenedor que define el progreso del scroll (por defecto, la tarjeta). */
  scrollRef?: React.RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reducir = useReducedMotion();
  const [conMouse, setConMouse] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const actualizar = () => setConMouse(mq.matches);
    actualizar();
    mq.addEventListener("change", actualizar);
    return () => mq.removeEventListener("change", actualizar);
  }, []);

  // Tilt con resorte "pesado"
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const resorte = { stiffness: 70, damping: 18, mass: 1.4 };
  const app = modo === "app";
  const k = app ? 0.6 : 1;
  const rotX = useSpring(useTransform(py, [-0.5, 0.5], [5 * k, -5 * k]), resorte);
  const rotYMouse = useSpring(useTransform(px, [-0.5, 0.5], [-7 * k, 7 * k]), resorte);
  const glareX = useSpring(useTransform(px, [-0.5, 0.5], [-18 * k, 18 * k]), resorte);
  const glareY = useSpring(useTransform(py, [-0.5, 0.5], [-10 * k, 10 * k]), resorte);

  // Scroll
  const { scrollYProgress } = useScroll({ target: scrollRef ?? ref, offset: ["start start", "end start"] });
  const rotYScroll = useTransform(scrollYProgress, [0, 1], scroll.rotateY);
  const y = useTransform(scrollYProgress, [0, 1], scroll.y);
  const scale = useTransform(scrollYProgress, [0, 1], scroll.scale);
  const rotY = useTransform(() => rotYMouse.get() + (app ? 0 : rotYScroll.get()));
  const glare = useTransform(() => `${glareX.get()}%`);
  const glareV = useTransform(() => `${glareY.get()}%`);

  function mover(e: React.PointerEvent) {
    if (!conMouse || reducir || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  }
  function salir() {
    px.set(0);
    py.set(0);
  }

  const quieta = reducir || (app && !conMouse);
  return (
    <div className={`[perspective:1400px] ${className}`}>
      <div ref={ref} onPointerMove={mover} onPointerLeave={salir} className="relative">
        <m.div
          style={
            quieta
              ? undefined
              : conMouse
                ? app
                  ? { rotateX: rotX, rotateY: rotY, ["--glare-x" as string]: glare, ["--glare-y" as string]: glareV }
                  : { rotateX: rotX, rotateY: rotY, y, scale, ["--glare-x" as string]: glare, ["--glare-y" as string]: glareV }
                : { rotateZ: -3, rotateY: rotYScroll, y, scale }
          }
          className={`relative rounded-pt-lg [transform-style:preserve-3d] ${app ? "shadow-pt-card-app" : "shadow-pt-card"}`}
        >
          <PointCard {...tarjeta} />
        </m.div>
        {/* 3. Sombra ambiental debajo */}
        {!app && <div className="pointer-events-none absolute inset-x-[12%] -bottom-[9%] h-[14%] rounded-[50%] bg-black/25 blur-2xl" />}
      </div>
    </div>
  );
}
