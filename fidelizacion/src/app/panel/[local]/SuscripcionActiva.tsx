"use client";

import { useEffect, useState } from "react";
import { CheckCanje } from "@/components/Animaciones";
import { Confeti } from "@/components/app/Confeti";
import { Mascota } from "@/components/app/Mascota";
import { claseBoton } from "@/components/app/Boton";

/** Festejo al volver de suscribirse: Mercado Pago aprobó la tarjeta y la cuenta quedó activa. */
export function SuscripcionActiva() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Sacamos el parámetro para que recargar no repita el festejo.
    const url = new URL(window.location.href);
    url.searchParams.delete("bienvenida");
    window.history.replaceState(null, "", url);
    try {
      navigator.vibrate?.([60, 40, 120]);
    } catch {}
  }, []);

  if (!visible) return null;

  return (
    <div
      className="blanco-fijo anim-aparecer fixed inset-0 z-50 flex flex-col items-center justify-center bg-pt-card px-8 text-center text-white"
      style={{ backgroundImage: "radial-gradient(80% 50% at 50% 35%, color-mix(in oklab, var(--color-pt-accent) 20%, transparent), transparent 70%)" }}
      role="dialog"
      aria-live="polite"
    >
      <div className="relative">
        <Confeti />
        <Mascota estado="festejo" tamaño={200} />
        <span
          className="anim-pop absolute -bottom-1 -right-3 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-pt-flotante"
          style={{ animationDelay: "350ms" }}
        >
          <CheckCanje color="var(--color-pt-accent-dark)" tamaño={56} />
        </span>
      </div>
      <h2 className="anim-subir mt-8 text-[28px] font-semibold leading-tight tracking-[-0.02em]" style={{ animationDelay: "200ms" }}>
        ¡Pago aprobado!
      </h2>
      <p className="anim-subir mt-2 max-w-[340px] text-[16px] leading-snug text-white/70" style={{ animationDelay: "300ms" }}>
        Mercado Pago confirmó tu tarjeta y tu cuenta de Point ya está activa.
      </p>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className={claseBoton("acento", "lg", "anim-subir mt-8")}
        style={{ animationDelay: "450ms" }}
      >
        Empezar
      </button>
    </div>
  );
}
