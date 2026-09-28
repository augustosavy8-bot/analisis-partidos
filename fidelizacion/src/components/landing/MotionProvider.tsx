"use client";

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";

/** Carga Motion de forma liviana (componentes m.*) y respeta "reducir movimiento". */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
