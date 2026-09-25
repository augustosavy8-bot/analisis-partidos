"use client";

import { useEffect, useState } from "react";

type Props = {
  tipo: "suma" | "canje";
  /** Puntos que sumó este toque (más de 1 si había promo). */
  sumados: number;
  promo: string | null;
  regalos: { motivo: "bienvenida" | "cumple"; puntos: number }[];
  puntos: number;
  mensaje: string;
};

const CHISPAS = Array.from({ length: 14 }, (_, i) => {
  const ang = (i / 14) * Math.PI * 2;
  const r = 110 + (i % 3) * 30;
  return { dx: Math.cos(ang) * r, dy: Math.sin(ang) * r, retardo: (i % 4) * 40 };
});

export function Celebracion({ tipo, sumados, promo, regalos, puntos, mensaje }: Props) {
  const total = sumados + regalos.reduce((a, r) => a + r.puntos, 0);
  const cumple = regalos.some((r) => r.motivo === "cumple");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Sacamos el parámetro de la URL para que recargar no repita la animación.
    const url = new URL(window.location.href);
    url.searchParams.delete("m");
    window.history.replaceState(null, "", url);
    try {
      navigator.vibrate?.(tipo === "canje" ? [60, 40, 120] : 50);
    } catch {}
  }, [tipo]);

  if (!visible) return null;

  return (
    <div
      className="anim-aparecer fixed inset-0 z-50 flex flex-col items-center justify-center px-8 text-center"
      style={{ background: "var(--marca)", color: "var(--marca-texto)" }}
      onClick={() => setVisible(false)}
      role="dialog"
      aria-live="polite"
    >
      <div className="relative flex h-44 w-44 items-center justify-center">
        <span className="anim-onda absolute inset-0 rounded-full" style={{ background: "var(--marca-acento)" }} />
        {CHISPAS.map((c, i) => (
          <span
            key={i}
            className="anim-chispa absolute h-2.5 w-2.5 rounded-full"
            style={{
              background: "var(--marca-acento)",
              ["--dx" as string]: `${c.dx}px`,
              ["--dy" as string]: `${c.dy}px`,
              animationDelay: `${250 + c.retardo}ms`,
            }}
          />
        ))}
        <div
          className="anim-pop relative flex h-40 w-40 items-center justify-center rounded-full text-6xl font-bold shadow-2xl"
          style={{ background: "var(--marca-acento)", color: "var(--marca)" }}
        >
          {tipo === "suma" ? `+${total}` : "🎁"}
        </div>
      </div>

      <h1 className="anim-subir mt-10 text-3xl font-semibold tracking-tight" style={{ animationDelay: "350ms" }}>
        {tipo === "canje"
          ? "¡Premio canjeado!"
          : cumple
            ? "¡Feliz cumple! 🎂"
            : total === 1
              ? "¡Sumaste un punto!"
              : `¡Sumaste ${total} puntos!`}
      </h1>
      {tipo === "suma" && (promo || regalos.length > 0) && (
        <ul className="anim-subir mt-3 space-y-1 text-base opacity-90" style={{ animationDelay: "400ms" }}>
          {promo && <li>🔥 {promo}: +{sumados}</li>}
          {regalos.map((r) => (
            <li key={r.motivo}>
              {r.motivo === "cumple" ? "🎂 Regalo de cumple" : "👋 Regalo de bienvenida"}: +{r.puntos}
            </li>
          ))}
        </ul>
      )}
      <p className="anim-subir mt-3 text-lg opacity-85" style={{ animationDelay: "450ms" }}>
        {mensaje}
      </p>
      <p className="anim-subir mt-1 text-sm opacity-70" style={{ animationDelay: "500ms" }}>
        Tenés {puntos} {puntos === 1 ? "punto" : "puntos"}
      </p>

      <button
        onClick={() => setVisible(false)}
        className="anim-subir mt-12 rounded-full px-8 py-3.5 font-semibold shadow-lg"
        style={{ background: "var(--marca-texto)", color: "var(--marca)", animationDelay: "700ms" }}
      >
        Ver mi tarjeta
      </button>
    </div>
  );
}
