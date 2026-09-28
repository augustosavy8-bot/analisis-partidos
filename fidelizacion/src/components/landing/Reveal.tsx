"use client";

import { m } from "motion/react";

export const EASE = [0.22, 1, 0.36, 1] as const;

/** Entrada de contenido: opacity 0→1, translateY 24→0, 600ms. Stagger con `orden` (80ms). */
export function Reveal({
  children,
  orden = 0,
  className = "",
  as = "div",
}: {
  children: React.ReactNode;
  orden?: number;
  className?: string;
  as?: "div" | "p" | "h1" | "h2" | "h3" | "li";
}) {
  const M = m[as];
  return (
    <M
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.6, ease: EASE, delay: Math.min(orden, 5) * 0.08 }}
    >
      {children}
    </M>
  );
}
