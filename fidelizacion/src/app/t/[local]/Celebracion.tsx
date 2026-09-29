"use client";

import { useEffect, useState } from "react";
import { CheckCanje, SelloAnimado } from "@/components/Animaciones";
import { TarjetaCompletaAnimada } from "./TarjetaCompletaAnimada";
import { claseBoton } from "@/components/app/Boton";

type Props = {
  tipo: "suma" | "canje";
  /** Puntos que sumó este toque (más de 1 si había promo). */
  sumados: number;
  promo: string | null;
  /** Si con este toque completó un premio: se muestra la tarjeta completa. */
  completo?: { meta: number; premio: string } | null;
  /** Nombre del premio (canje). */
  premio?: string | null;
  regalos: { motivo: "bienvenida" | "cumple"; puntos: number }[];
  puntos: number;
  mensaje: string;
  /** Local (para dibujar su tarjeta cuando se completa). */
  comercio: string;
  logo: string | null;
};

export function Celebracion({ tipo, sumados, promo, premio, completo, regalos, puntos, mensaje, comercio, logo }: Props) {
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
      className="anim-aparecer fixed inset-0 z-50 flex flex-col items-center justify-center bg-pt-card px-8 text-center text-white"
      style={{ backgroundImage: "radial-gradient(80% 50% at 50% 35%, color-mix(in oklab, var(--color-pt-accent) 20%, transparent), transparent 70%)" }}
      // El canje no se cierra tocando el fondo: el personal tiene que poder verlo.
      onClick={() => tipo === "suma" && setVisible(false)}
      role="dialog"
      aria-live="polite"
    >
      <div className="relative flex min-h-44 items-center justify-center">
        {tipo === "canje" ? (
          <div className="anim-pop flex h-44 w-44 items-center justify-center rounded-full bg-white shadow-pt-flotante">
            <CheckCanje color="var(--color-pt-accent-dark)" tamaño={140} />
          </div>
        ) : completo ? (
          <TarjetaCompletaAnimada meta={completo.meta} premio={completo.premio} comercio={comercio} logo={logo} />
        ) : (
          <div className="relative">
            <SelloAnimado aro="var(--color-pt-accent)" ondas="#fff" tamaño={176} />
            <span
              className="anim-subir absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-pt-accent px-4 py-1.5 font-[family-name:var(--font-pt-display)] text-2xl font-bold tabular-nums text-pt-ink shadow-pt-flotante"
              style={{ animationDelay: "450ms" }}
            >
              +{total}
            </span>
          </div>
        )}
      </div>

      <h1 className="pt-app-titulo anim-subir mt-10" style={{ animationDelay: completo ? "900ms" : "350ms" }}>
        {tipo === "canje"
          ? "¡Premio canjeado!"
          : completo
            ? "¡Completaste tu tarjeta!"
            : cumple
            ? "¡Feliz cumple! 🎂"
            : total === 1
              ? "¡Sumaste un punto!"
              : `¡Sumaste ${total} puntos!`}
      </h1>
      {tipo === "suma" && (promo || regalos.length > 0) && (
        <ul className="anim-subir mt-3 space-y-1 pt-app-texto text-white/85" style={{ animationDelay: "400ms" }}>
          {promo && <li>🔥 {promo}: +{sumados}</li>}
          {regalos.map((r) => (
            <li key={r.motivo}>
              {r.motivo === "cumple" ? "🎂 Regalo de cumple" : "👋 Regalo de bienvenida"}: +{r.puntos}
            </li>
          ))}
        </ul>
      )}
      {tipo === "canje" && premio && (
        <div className="anim-subir mt-5 rounded-pt-card bg-pt-accent px-6 py-4 text-pt-ink" style={{ animationDelay: "400ms" }}>
          <p className="pt-label uppercase">Premio</p>
          <p className="mt-0.5 font-[family-name:var(--font-pt-display)] text-2xl font-semibold tracking-tight">{premio}</p>
          <Reloj />
        </div>
      )}
      {tipo === "canje" && (
        <p className="anim-subir mt-4 pt-app-texto font-medium" style={{ animationDelay: "450ms" }}>
          Mostrale esta pantalla a quien te atiende.
        </p>
      )}
      {completo ? (
        <>
          <p className="anim-subir mt-3 pt-app-texto text-white/80" style={{ animationDelay: "1000ms" }}>
            Desbloqueaste
          </p>
          <p
            className="anim-subir mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 font-[family-name:var(--font-pt-display)] text-lg font-semibold ring-1 ring-white/15"
            style={{ animationDelay: "1050ms" }}
          >
            <span className="h-2 w-2 rounded-full bg-pt-accent" aria-hidden />
            {completo.premio}
          </p>
          <div className="anim-subir mt-10 flex w-full max-w-xs flex-col items-center gap-2" style={{ animationDelay: "1200ms" }}>
            <button
              onClick={() => {
                setVisible(false);
                window.location.hash = "premios";
              }}
              className={claseBoton("acento", "lg")}
            >
              Canjear ahora
            </button>
            <button onClick={() => setVisible(false)} className={claseBoton("fantasma", "md", "!text-white/75 hover:!bg-white/10 hover:!text-white")}>
              Ahora no
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="anim-subir mt-3 pt-app-texto text-white/85" style={{ animationDelay: "450ms" }}>
            {mensaje}
          </p>
          <p className="anim-subir mt-1 pt-app-detalle text-white/70" style={{ animationDelay: "500ms" }}>
            Tenés <Contador hasta={puntos} desde={Math.max(0, puntos - (tipo === "suma" ? total : 0))} /> {puntos === 1 ? "punto" : "puntos"}
          </p>

          <button
            onClick={() => setVisible(false)}
            className={`anim-subir ${claseBoton("acento", "md", "mt-12 !h-pt-control !px-8")}`}
            style={{ animationDelay: "700ms" }}
          >
            Ver mi tarjeta
          </button>
        </>
      )}
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
      <span className="h-2 w-2 rounded-full bg-current motion-safe:animate-pulse" aria-hidden />
      {ahora.toLocaleDateString("es-AR", { day: "numeric", month: "short" })} ·{" "}
      {ahora.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })}
    </p>
  );
}
