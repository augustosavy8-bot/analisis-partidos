"use client";

import { useRef } from "react";
import type { Local } from "@/lib/locales";
import type { Premio } from "@/lib/tarjeta";
import { LogoLocal } from "@/components/CabeceraLocal";
import { Icono } from "@/components/Icono";

type Props = {
  local: Local;
  puntos: number;
  objetivo: Premio | null;
  /** Nombre del cliente (se muestra como "socio"). */
  titular?: string;
  /** Fecha de alta (ISO) para "socio desde". */
  desde?: string;
  /** Serial de la tarjeta: se muestran los últimos 4. */
  serial?: string;
  /** Texto debajo del número (por defecto "puntos"). */
  etiquetaPuntos?: string;
};

/** Tarjeta de puntos con la marca del local, con aspecto de tarjeta física (inclinación 3D al tocarla). */
export function TarjetaVisual({ local, puntos, objetivo, titular, desde, serial, etiquetaPuntos }: Props) {
  return (
    <div className="mt-5">
      <TarjetaFisica
        local={local}
        puntos={puntos}
        titular={titular}
        desde={desde}
        serial={serial}
        etiquetaPuntos={etiquetaPuntos}
      />
      {objetivo && <Progreso puntos={puntos} objetivo={objetivo} />}
    </div>
  );
}

function TarjetaFisica({ local, puntos, titular, desde, serial, etiquetaPuntos }: Omit<Props, "objetivo">) {
  const ref = useRef<HTMLDivElement>(null);

  // Inclinación suave siguiendo el dedo/mouse (sin estado: se escribe directo en el estilo).
  function mover(e: React.PointerEvent) {
    const el = ref.current;
    if (!el || e.pointerType === "touch" && e.buttons === 0) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 14}deg)`;
    el.style.setProperty("--luz-x", `${(x + 0.5) * 100}%`);
    el.style.setProperty("--luz-y", `${(y + 0.5) * 100}%`);
  }
  function soltar() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "";
    el.style.removeProperty("--luz-x");
    el.style.removeProperty("--luz-y");
  }

  const mesAnio = desde ? formatearMesAnio(desde, local.zona_horaria) : null;

  return (
    <div className="anim-entrar-tarjeta [perspective:1200px]">
      <div
        ref={ref}
        onPointerMove={mover}
        onPointerLeave={soltar}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        className="relative aspect-[1.586/1] w-full touch-pan-y select-none overflow-hidden rounded-[22px] transition-transform duration-300 ease-out [transform-style:preserve-3d]"
        style={{
          color: "var(--marca-texto)",
          background:
            "linear-gradient(135deg, color-mix(in oklab, var(--marca), white 10%) 0%, var(--marca) 45%, color-mix(in oklab, var(--marca), black 38%) 100%)",
          boxShadow:
            "0 1px 0 rgb(255 255 255 / 0.18) inset, 0 0 0 1px rgb(0 0 0 / 0.08), 0 24px 48px -20px color-mix(in oklab, var(--marca), black 30%), 0 8px 16px -8px rgb(0 0 0 / 0.25)",
        }}
      >
        {/* Resplandor del color de acento */}
        <div
          className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full opacity-30 blur-3xl"
          style={{ background: "var(--marca-acento)" }}
        />
        {/* Líneas finas diagonales (textura) */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "repeating-linear-gradient(115deg, currentColor 0 1px, transparent 1px 14px)",
            maskImage: "linear-gradient(100deg, transparent 35%, black 75%)",
          }}
        />
        {/* Luz que sigue el dedo */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at var(--luz-x, 30%) var(--luz-y, 0%), rgb(255 255 255 / 0.22), transparent 55%)",
          }}
        />
        {/* Brillo que cruza la tarjeta al aparecer */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 overflow-hidden">
          <div className="anim-brillo h-full w-full bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        </div>

        <div className="relative flex h-full flex-col justify-between p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <LogoLocal local={local} tamaño={34} />
              <p className="truncate text-[15px] font-semibold tracking-tight">{local.nombre}</p>
            </div>
            <Icono nombre="nfc" tamaño={24} className="shrink-0 opacity-80" />
          </div>

          <div>
            <p className="text-[56px] font-semibold leading-none tracking-[-0.04em] tabular-nums [text-shadow:0_2px_12px_rgb(0_0_0/0.15)]">
              {puntos}
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] opacity-75">
              {etiquetaPuntos ?? (puntos === 1 ? "punto" : "puntos")}
            </p>
          </div>

          <div className="flex items-end justify-between gap-3 text-[10px] uppercase tracking-[0.16em]">
            <div className="min-w-0">
              <p className="opacity-60">Socio</p>
              <p className="mt-0.5 truncate text-[13px] font-semibold tracking-[0.08em]">{titular?.trim() || "Tu nombre"}</p>
            </div>
            <div className="shrink-0 text-right">
              {mesAnio && <p className="opacity-60">Desde {mesAnio}</p>}
              {serial && <p className="mt-0.5 font-mono text-[12px] tracking-[0.12em] opacity-90">•••• {serial.slice(-4).toUpperCase()}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/** Sellos (hasta 12) o barra, hacia el próximo premio. */
function Progreso({ puntos, objetivo }: { puntos: number; objetivo: Premio }) {
  const meta = objetivo.puntos_necesarios;
  const usarSellos = meta <= 12;
  const faltan = Math.max(0, meta - puntos);
  const columnas = meta <= 8 ? meta : Math.ceil(meta / 2);

  return (
    <div className="superficie mt-4 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="titulo-seccion !px-0">Próximo premio</p>
        <p className="text-xs font-medium tabular-nums text-stone-500">
          {Math.min(puntos, meta)}/{meta}
        </p>
      </div>
      <p className="mt-1 text-lg font-semibold tracking-tight text-stone-900">{objetivo.nombre}</p>

      {usarSellos ? (
        <div className="mt-4 grid justify-between gap-2" style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 2.75rem))` }}>
          {Array.from({ length: meta }, (_, i) => (
            <Sello key={i} lleno={i < puntos} retardo={i * 45} />
          ))}
        </div>
      ) : (
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-stone-900/[0.06]">
          <div
            className="h-full rounded-full transition-[width] duration-700"
            style={{
              width: `${Math.min(1, puntos / meta) * 100}%`,
              background: "linear-gradient(90deg, color-mix(in oklab, var(--marca-acento), white 20%), var(--marca-acento))",
              boxShadow: "0 0 12px var(--marca-acento)",
            }}
          />
        </div>
      )}

      <p className="mt-4 text-sm text-stone-600">
        {faltan > 0 ? (
          <>
            {faltan === 1 ? "Te falta " : "Te faltan "}
            <strong className="font-semibold text-stone-900">
              {faltan} {faltan === 1 ? "punto" : "puntos"}
            </strong>
          </>
        ) : (
          <strong className="font-semibold text-stone-900">¡Ya lo podés canjear! 🎉</strong>
        )}
      </p>
    </div>
  );
}

/** "09/26" en la zona del local. */
function formatearMesAnio(iso: string, zona: string) {
  const partes = new Intl.DateTimeFormat("en-US", { month: "2-digit", year: "2-digit", timeZone: zona }).formatToParts(new Date(iso));
  const v = (t: string) => partes.find((x) => x.type === t)?.value ?? "";
  return `${v("month")}/${v("year")}`;
}

/** Sello de Point: aro del color del local, punto y ondas del acento. Vacío en gris. */
function Sello({ lleno, retardo }: { lleno: boolean; retardo: number }) {
  const aro = lleno ? "var(--marca)" : "#D6D1CC";
  const punto = lleno ? "var(--marca-acento)" : "#D6D1CC";
  return (
    <svg
      viewBox="4 6 96 96"
      className={`aspect-square w-full overflow-visible ${lleno ? "" : "opacity-70"}`}
      style={lleno ? { filter: "drop-shadow(0 3px 4px rgb(0 0 0 / 0.12))" } : undefined}
      aria-hidden
    >
      <g className={lleno ? "pt-sello" : ""} style={lleno ? { transformOrigin: "46px 56px", animationDelay: `${retardo}ms` } : undefined}>
        <circle cx="46" cy="56" r="33" style={{ stroke: aro }} strokeWidth="10" fill="none" />
        <circle cx="46" cy="56" r="13" style={{ fill: punto }} />
        <path d="M 64 30 A 23 23 0 0 1 77 52" style={{ stroke: punto }} strokeWidth="6" strokeLinecap="round" fill="none" />
        <path d="M 76 20 A 33 33 0 0 1 91 58" style={{ stroke: punto }} strokeWidth="6" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}
