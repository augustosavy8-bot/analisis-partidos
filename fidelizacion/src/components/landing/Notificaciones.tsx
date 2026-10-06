"use client";

import { useEffect, useRef, useState } from "react";
import { IPhoneMockup } from "./IPhoneMockup";
import { Etiqueta } from "./Section";
import { Reveal } from "./Reveal";

const MENSAJES = [
  "Hoy 2x1 en medialunas hasta las 11 ☕🥐",
  "¡Te falta 1 punto para tu café gratis! Te esperamos.",
  "Esta semana es tu cumple 🎂 Pasá a buscar tu regalo.",
  "Nuevo flat white de avellanas: probalo con doble punto.",
];

const VISIBLES = 3;
const POR_LETRA = 32;

type Notif = { id: number; texto: string };

/** 14 — Notificaciones: escribís en el panel y le llega al cliente a la pantalla bloqueada. */
export function Notificaciones() {
  const ref = useRef<HTMLDivElement>(null);
  const [tipeado, setTipeado] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [lista, setLista] = useState<Notif[]>([]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let timers: number[] = [];
    let id = 0;
    const despues = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    const limpiar = () => {
      timers.forEach(clearTimeout);
      timers = [];
    };

    // Un mensaje: se tipea, se aprieta Enviar y cae la notificación en el teléfono.
    const ciclo = (n: number) => {
      const texto = MENSAJES[n % MENSAJES.length];
      for (let i = 1; i <= texto.length; i++) despues(i * POR_LETRA, () => setTipeado(texto.slice(0, i)));
      const fin = texto.length * POR_LETRA;
      despues(fin + 450, () => setEnviando(true));
      despues(fin + 700, () => {
        setEnviando(false);
        setTipeado("");
        setLista((l) => [{ id: id++, texto }, ...l].slice(0, VISIBLES + 1));
      });
      despues(fin + 3200, () => ciclo(n + 1));
    };

    let n = 0;
    const io = new IntersectionObserver(([v]) => {
      limpiar();
      if (!v.isIntersecting) return;
      // Sin animaciones: las notificaciones ya están ahí.
      if (quieto) setLista(MENSAJES.slice(0, VISIBLES).map((texto, i) => ({ id: i, texto })).reverse());
      else ciclo(n++);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      limpiar();
    };
  }, []);

  return (
    <section id="notificaciones" className="scroll-mt-16 overflow-hidden bg-pt-ink text-white">
      <div ref={ref} className="mx-auto grid max-w-[1280px] items-center gap-16 px-5 py-24 md:px-8 md:py-40 lg:grid-cols-2">
        <div>
          <Reveal>
            <Etiqueta oscuro>Notificaciones</Etiqueta>
            <h2 className="pt-display mt-4">Llegá directo a su teléfono.</h2>
            <p className="pt-lead mt-4 max-w-[480px] text-white/60">
              Escribís un mensaje en el panel y a cada cliente le aparece en la pantalla bloqueada, desde la tarjeta de su Wallet. Sin apps y sin pagar por
              mensaje.
            </p>
          </Reveal>
          <Reveal orden={1} className="mt-10 max-w-[480px]">
            <Composer texto={tipeado} enviando={enviando} />
          </Reveal>
        </div>

        <div className="flex justify-center">
          <div className="w-[min(78vw,330px)]">
            <IPhoneMockup>
              <PantallaBloqueada lista={lista} />
            </IPhoneMockup>
          </div>
        </div>
      </div>
    </section>
  );
}

function Composer({ texto, enviando }: { texto: string; enviando: boolean }) {
  return (
    <div className="rounded-pt-card bg-[#1d211d] p-5 ring-1 ring-white/10" aria-hidden>
      <p className="pt-label uppercase text-white/50">Mensaje a tus clientes</p>
      <div className="mt-3 min-h-[76px] rounded-pt-sm bg-black/30 px-4 py-3 pt-body text-white/90 ring-1 ring-white/10">
        {texto}
        <span className="pt-cursor-texto ml-px inline-block h-[1.1em] w-[2px] translate-y-[3px] bg-pt-accent" />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="pt-ui text-white/50">Llega a 1.284 clientes</span>
        <span
          className={`rounded-full bg-pt-accent px-5 py-2 pt-ui font-semibold text-pt-sobre-acento transition-transform duration-150 ${enviando ? "scale-90" : ""}`}
        >
          Enviar
        </span>
      </div>
    </div>
  );
}

const ALTO = 20; // alto de cada notificación, en cqw
const SEPARACION = 2.2;

function PantallaBloqueada({ lista }: { lista: Notif[] }) {
  return (
    <div
      className="@container relative h-full text-white"
      style={{
        background:
          "radial-gradient(90% 60% at 15% 12%, #5b7cfa 0%, transparent 60%), radial-gradient(80% 55% at 90% 40%, #ff8a5c 0%, transparent 60%), radial-gradient(90% 60% at 30% 95%, #36d477 0%, transparent 60%), linear-gradient(160deg, #1b2450 0%, #2a1f3d 50%, #0f2a22 100%)",
      }}
    >
      {/* Barra de estado */}
      <div className="flex items-center justify-between px-[8cqw] pt-[5.2cqw] font-semibold" style={{ fontSize: "3.6cqw" }}>
        <span />
        <svg viewBox="0 0 26 12" style={{ width: "6.4cqw" }} aria-hidden>
          <rect x="0.5" y="0.5" width="22" height="11" rx="3" fill="none" stroke="currentColor" opacity=".5" />
          <rect x="2" y="2" width="17" height="8" rx="1.8" fill="currentColor" />
          <rect x="23.5" y="4" width="1.8" height="4" rx=".9" fill="currentColor" opacity=".5" />
        </svg>
      </div>

      {/* Fecha y hora */}
      <div className="mt-[9cqw] text-center">
        <p className="font-semibold text-white/85" style={{ fontSize: "4.6cqw" }}>
          lunes 6 de octubre
        </p>
        <p
          className="font-[family-name:var(--font-manrope)] font-semibold leading-none tracking-[-0.04em] text-white/90"
          style={{ fontSize: "24cqw", textShadow: "0 2px 18px rgba(0,0,0,.18)" }}
        >
          9:41
        </p>
      </div>

      {/* Notificaciones: la más nueva arriba, las anteriores bajan */}
      <div className="absolute inset-x-[3.5cqw]" style={{ top: "70cqw" }} aria-hidden>
        {lista.map((n, i) => (
          <div
            key={n.id}
            className="absolute inset-x-0 transition-[transform,opacity] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]"
            style={{
              transform: `translateY(${i * (ALTO + SEPARACION)}cqw)`,
              opacity: i >= VISIBLES ? 0 : 1,
            }}
          >
            <div className="pt-notif-entra">
              <Notificacion texto={n.texto} />
            </div>
          </div>
        ))}
      </div>

      {/* Linterna y cámara */}
      <div className="absolute inset-x-[11cqw] bottom-[9cqw] flex justify-between">
        {["M9 2h6l-1 6h-4zM10 8h4v12a2 2 0 0 1-4 0z", "M4 8h3l2-3h6l2 3h3v11H4zM12 10.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"].map((d) => (
          <span key={d} className="vidrio-liquido flex items-center justify-center rounded-full" style={{ width: "13cqw", height: "13cqw" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" style={{ width: "5.6cqw" }}>
              <path d={d} />
            </svg>
          </span>
        ))}
      </div>
      <span className="absolute bottom-[2.4cqw] left-1/2 h-[1.4cqw] w-[34cqw] -translate-x-1/2 rounded-full bg-white/90" />
    </div>
  );
}

function Notificacion({ texto }: { texto: string }) {
  return (
    <div className="vidrio-liquido flex items-start gap-[3cqw] rounded-[6.5cqw] p-[3.4cqw]" style={{ height: `${ALTO}cqw` }}>
      <span
        className="flex shrink-0 items-center justify-center rounded-[2.6cqw] bg-[#161916] font-semibold text-white"
        style={{ width: "10cqw", height: "10cqw", fontSize: "4.6cqw" }}
      >
        A
      </span>
      <div className="min-w-0 flex-1" style={{ fontSize: "3.7cqw", lineHeight: 1.3 }}>
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold">Café Aurora</span>
          <span className="shrink-0 text-white/60" style={{ fontSize: "3.3cqw" }}>
            ahora
          </span>
        </div>
        <p className="line-clamp-2 text-white/95">{texto}</p>
      </div>
    </div>
  );
}
