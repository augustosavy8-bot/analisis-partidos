"use client";

import { useEffect, useState } from "react";

type Props = {
  tipo: "suma" | "canje";
  /** Puntos que sumó este toque (más de 1 si había promo). */
  sumados: number;
  promo: string | null;
  /** Nombre del premio (canje). */
  premio?: string | null;
  regalos: { motivo: "bienvenida" | "cumple"; puntos: number }[];
  puntos: number;
  mensaje: string;
};

const CHISPAS = Array.from({ length: 14 }, (_, i) => {
  const ang = (i / 14) * Math.PI * 2;
  const r = 110 + (i % 3) * 30;
  return { dx: Math.cos(ang) * r, dy: Math.sin(ang) * r, retardo: (i % 4) * 40 };
});

export function Celebracion({ tipo, sumados, promo, premio, regalos, puntos, mensaje }: Props) {
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
      style={{
        background:
          "radial-gradient(80% 50% at 50% 35%, color-mix(in oklab, var(--marca-acento) 22%, var(--marca)), var(--marca) 70%), var(--marca)",
        color: "var(--marca-texto)",
      }}
      // El canje no se cierra tocando el fondo: el personal tiene que poder verlo.
      onClick={() => tipo === "suma" && setVisible(false)}
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
      {tipo === "canje" && premio && (
        <div className="anim-subir mt-5 rounded-3xl px-6 py-4" style={{ background: "var(--marca-acento)", color: "var(--marca)", animationDelay: "400ms" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">Premio</p>
          <p className="mt-0.5 text-2xl font-semibold tracking-tight">{premio}</p>
          <Reloj />
        </div>
      )}
      {tipo === "canje" && (
        <p className="anim-subir mt-4 text-base font-medium" style={{ animationDelay: "450ms" }}>
          Mostrale esta pantalla a quien te atiende.
        </p>
      )}
      <p className="anim-subir mt-3 text-lg opacity-85" style={{ animationDelay: "450ms" }}>
        {mensaje}
      </p>
      <p className="anim-subir mt-1 text-sm opacity-70" style={{ animationDelay: "500ms" }}>
        Tenés <Contador hasta={puntos} desde={Math.max(0, puntos - (tipo === "suma" ? total : 0))} /> {puntos === 1 ? "punto" : "puntos"}
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

/** Número que sube de "desde" a "hasta" (animación corta). */
function Contador({ desde, hasta }: { desde: number; hasta: number }) {
  const [valor, setValor] = useState(desde);
  useEffect(() => {
    if (desde === hasta) return;
    const inicio = performance.now();
    let id = 0;
    const paso = (t: number) => {
      const k = Math.min(1, (t - inicio - 600) / 700);
      if (k > 0) setValor(Math.round(desde + (hasta - desde) * (1 - (1 - k) ** 3)));
      if (k < 1) id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [desde, hasta]);
  return <strong className="font-semibold tabular-nums">{valor}</strong>;
}

/** Hora en vivo con segundos: muestra que la pantalla no es una captura. */
function Reloj() {
  const [ahora, setAhora] = useState<Date | null>(null);
  useEffect(() => {
    const tic = () => setAhora(new Date());
    const primero = setTimeout(tic, 0);
    const id = setInterval(tic, 1000);
    return () => {
      clearTimeout(primero);
      clearInterval(id);
    };
  }, []);
  if (!ahora) return <p className="mt-2 h-5" />;
  return (
    <p className="mt-2 flex items-center justify-center gap-2 text-sm font-semibold tabular-nums">
      <span className="h-2 w-2 animate-pulse rounded-full bg-current" aria-hidden />
      {ahora.toLocaleDateString("es-AR", { day: "numeric", month: "short" })} ·{" "}
      {ahora.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })}
    </p>
  );
}
