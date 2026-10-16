"use client";

import { useEffect, useState } from "react";
import { CheckCanje } from "@/components/Animaciones";
import { Confeti } from "@/components/app/Confeti";
import { Mascota } from "@/components/app/Mascota";
import { claseBoton } from "@/components/app/Boton";

export type AltaSuscripcion =
  | { estado: "authorized"; plan: string }
  | { estado: "trialing"; plan: string; finPrueba: string | null }
  | { estado: "pending"; plan: string };

/**
 * Al volver de suscribirse, según el estado REAL de la suscripción: pago aprobado,
 * prueba gratis (no se cobró nada) o Mercado Pago todavía confirmando.
 */
export function SuscripcionActiva({ alta }: { alta: AltaSuscripcion }) {
  const [visible, setVisible] = useState(true);
  const confirmada = alta.estado !== "pending";

  useEffect(() => {
    // Sacamos el parámetro para que recargar no repita el aviso.
    const url = new URL(window.location.href);
    url.searchParams.delete("bienvenida");
    window.history.replaceState(null, "", url);
    if (!confirmada) return;
    try {
      navigator.vibrate?.([60, 40, 120]);
    } catch {}
  }, [confirmada]);

  if (!visible) return null;

  const titulo = alta.estado === "authorized" ? "¡Pago aprobado!" : alta.estado === "trialing" ? "¡Tu prueba gratis arrancó!" : "Estamos confirmando tu pago";
  const texto =
    alta.estado === "authorized"
      ? `Mercado Pago confirmó tu pago y tu plan ${alta.plan} ya está activo.`
      : alta.estado === "trialing"
        ? `Tu plan ${alta.plan} ya está activo. Hoy no se te cobra nada${alta.finPrueba ? `: el primer débito es el ${alta.finPrueba}` : ""}.`
        : "Mercado Pago está verificando tu tarjeta. Suele tardar unos minutos: el estado lo ves en Facturación.";

  return (
    <div
      className="blanco-fijo anim-aparecer fixed inset-0 z-50 flex flex-col items-center justify-center bg-pt-card px-8 text-center text-white"
      style={{ backgroundImage: "radial-gradient(80% 50% at 50% 35%, color-mix(in oklab, var(--color-pt-accent) 20%, transparent), transparent 70%)" }}
      role="dialog"
      aria-live="polite"
    >
      <div className="relative">
        {confirmada && <Confeti />}
        <Mascota estado={confirmada ? "festejo" : "pensando"} tamaño={200} />
        {confirmada && (
          <span
            className="anim-pop absolute -bottom-1 -right-3 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-pt-flotante"
            style={{ animationDelay: "350ms" }}
          >
            <CheckCanje color="var(--color-pt-accent-dark)" tamaño={56} />
          </span>
        )}
      </div>
      <h2 className="anim-subir mt-8 text-[28px] font-semibold leading-tight tracking-[-0.02em]" style={{ animationDelay: "200ms" }}>
        {titulo}
      </h2>
      <p className="anim-subir mt-2 max-w-[340px] text-[16px] leading-snug text-white/70" style={{ animationDelay: "300ms" }}>
        {texto}
      </p>
      <button type="button" onClick={() => setVisible(false)} className={claseBoton("acento", "lg", "anim-subir mt-8")} style={{ animationDelay: "450ms" }}>
        {confirmada ? "Empezar" : "Entendido"}
      </button>
    </div>
  );
}
