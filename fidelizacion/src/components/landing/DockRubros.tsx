"use client";

import { useEffect, useRef } from "react";
import { Etiqueta } from "./Section";
import { Reveal } from "./Reveal";

const RUBROS: { nombre: string; icono: React.ReactNode }[] = [
  {
    nombre: "Vinotecas",
    icono: (
      <>
        <path d="M27 6h10v12c0 3 7 6 7 13v25a3 3 0 0 1-3 3H23a3 3 0 0 1-3-3V31c0-7 7-10 7-13z" />
        <path d="M20 37h24M20 49h24M27 12h10" />
      </>
    ),
  },
  {
    nombre: "Cafés",
    icono: (
      <>
        <path d="M10 26h34v14a12 12 0 0 1-12 12H22a12 12 0 0 1-12-12z" />
        <path d="M44 30h4a6 6 0 0 1 0 12h-4M8 58h40" />
        <path d="M20 8c-2 3 2 6 0 9M27 8c-2 3 2 6 0 9M34 8c-2 3 2 6 0 9" />
      </>
    ),
  },
  {
    nombre: "Restaurantes",
    icono: (
      <>
        <path d="M16 6v12a6 6 0 0 0 12 0V6M22 6v14M22 24v34" />
        <path d="M46 58V6c-6 4-8 14-8 24h8" />
      </>
    ),
  },
  {
    nombre: "Gimnasios",
    icono: (
      <>
        <path d="M22 32h20" />
        <rect x="14" y="20" width="8" height="24" rx="2" />
        <rect x="42" y="20" width="8" height="24" rx="2" />
        <path d="M14 26H8v12h6M50 26h6v12h-6" />
      </>
    ),
  },
  {
    nombre: "Peluquerías",
    icono: (
      <>
        <circle cx="17" cy="47" r="8" />
        <circle cx="47" cy="47" r="8" />
        <path d="M23 41 50 8M41 41 14 8" />
      </>
    ),
  },
];

/** Ancho del escenario sin escalar: en pantallas más chicas se achica entero con transform. */
const ANCHO = 760;
const ALTO = 420;

/** Rubros: dock estilo macOS con un cursor que pasa por cada ícono, en loop de 8 s. */
export function DockRubros() {
  const marco = useRef<HTMLDivElement>(null);
  const escenario = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const m = marco.current;
    const e = escenario.current;
    if (!m || !e) return;

    const ajustar = () => {
      const escala = Math.min(1, (m.clientWidth - 32) / ANCHO);
      e.style.transform = `scale(${escala})`;
      m.style.height = `${ALTO * escala}px`;
    };
    ajustar();
    const ro = new ResizeObserver(ajustar);
    ro.observe(m);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => ro.disconnect();

    const dock = crearDockMagnetico(e);
    // Sólo anima mientras se ve. Al volver a entrar recalcula posiciones (start).
    const io = new IntersectionObserver(([v]) => (v.isIntersecting ? dock.start() : dock.stop()));
    io.observe(e);
    return () => {
      io.disconnect();
      ro.disconnect();
      dock.stop();
    };
  }, []);

  return (
    <section id="rubros" className="scroll-mt-16 overflow-hidden bg-pt-pure">
      <div className="mx-auto max-w-[1280px] px-5 pt-24 text-center md:px-8 md:pt-32">
        <Reveal>
          <Etiqueta>Rubros</Etiqueta>
          <h2 className="pt-display mx-auto mt-4 max-w-[900px] text-pt-ink">Para los que viven de que la gente vuelva.</h2>
        </Reveal>
      </div>

      <div ref={marco} className="relative mx-auto w-full max-w-[1280px] px-4" style={{ height: ALTO }}>
        <div
          ref={escenario}
          className="absolute left-1/2 top-0 flex items-end justify-center pb-[60px]"
          style={{ width: ANCHO, height: ALTO, marginLeft: -ANCHO / 2, transformOrigin: "50% 0" }}
          aria-hidden
        >
          <div className="flex gap-[22px] rounded-[36px] bg-pt-card p-[22px] shadow-pt-card">
            {RUBROS.map((r) => (
              <div
                key={r.nombre}
                data-dock-icono
                className="relative flex h-[112px] w-[112px] items-center justify-center rounded-[28px] bg-white text-pt-ink shadow-pt-ui will-change-transform"
                style={{ transformOrigin: "50% 100%" }}
              >
                <svg width="58" height="58" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  {r.icono}
                </svg>
                <span
                  data-dock-tooltip
                  className="pointer-events-none absolute bottom-[calc(100%+18px)] left-1/2 whitespace-nowrap rounded-full bg-pt-accent px-4 py-1.5 font-mono text-[17px] font-medium text-white opacity-0 shadow-pt-flotante"
                  style={{ transform: "translateX(-50%)", transformOrigin: "50% 100%" }}
                >
                  {r.nombre}
                </span>
              </div>
            ))}
          </div>

          <svg
            data-dock-cursor
            className="pointer-events-none absolute left-0 top-0 opacity-0"
            width="34"
            height="40"
            viewBox="0 0 34 40"
            style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,.28))", zIndex: 200 }}
          >
            <path d="M3 2v31l8-7.5 5.5 12 5-2.3-5.4-11.7H27z" fill="#fff" stroke="#111311" strokeWidth="2" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <ul className="mx-auto flex max-w-[760px] flex-wrap justify-center gap-3 px-5 pb-24 md:pb-32">
        {RUBROS.map((r) => (
          <li key={r.nombre} className="rounded-full border border-pt-border px-4 py-1.5 font-mono text-[15px] text-pt-ink-2 md:text-[19px]">
            {r.nombre.toLowerCase()}
          </li>
        ))}
      </ul>
    </section>
  );
}

const CICLO = 8;
const QUIETO = 0.7;
const VIAJE = 0.5;
const SALIDA = 0.6;
const MARGEN = 240;
const BAJO_CENTRO = 40;

const inOutCubico = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const clamp = (x: number) => Math.min(1, Math.max(0, x));

/** cubic-bezier(.2,.8,.2,1): resuelve x→t por Newton y devuelve y. */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const c = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  const d = (a: number, b: number, t: number) => 3 * a * (1 - t) ** 2 + 6 * (b - a) * t * (1 - t) + 3 * (1 - b) * t * t;
  return (x: number) => {
    let t = x;
    for (let i = 0; i < 6; i++) {
      const dx = d(x1, x2, t);
      if (Math.abs(dx) < 1e-6) break;
      t = clamp(t - (c(x1, x2, t) - x) / dx);
    }
    return c(y1, y2, t);
  };
}
const suave = bezier(0.2, 0.8, 0.2, 1);

/** Animación del dock magnético. Busca [data-dock-icono], [data-dock-tooltip] y [data-dock-cursor] dentro del escenario. */
export function crearDockMagnetico(escenario: HTMLElement): { start(): void; stop(): void } {
  const iconos = [...escenario.querySelectorAll<HTMLElement>("[data-dock-icono]")];
  const tooltips = iconos.map((i) => i.querySelector<HTMLElement>("[data-dock-tooltip]")!);
  const cursor = escenario.querySelector<SVGElement>("[data-dock-cursor]")!;
  let raf = 0;
  let inicio = 0;
  let centros: number[] = [];
  let yCursor = 0;
  let paradas: { t: number; x: number }[] = [];

  /** Posición x del cursor en t (segundos dentro del ciclo). */
  function xEn(t: number): number {
    for (let i = 1; i < paradas.length; i++) {
      const a = paradas[i - 1];
      const b = paradas[i];
      if (t <= b.t) return a.x + (b.x - a.x) * inOutCubico(clamp((t - a.t) / (b.t - a.t || 1)));
    }
    return paradas[0].x; // oculto: ya volvió al inicio
  }

  function visibilidad(t: number): number {
    if (t < 0.25) return suave(t / 0.25);
    if (t < 6.4) return 1;
    if (t < 6.8) return 1 - suave((t - 6.4) / 0.4);
    return 0;
  }

  function medir() {
    const caja = escenario.getBoundingClientRect();
    // Corrige el scale() del escenario: posiciones en px sin escalar.
    const escala = caja.width / escenario.offsetWidth || 1;
    const rects = iconos.map((i) => i.getBoundingClientRect());
    centros = rects.map((r) => (r.left + r.width / 2 - caja.left) / escala);
    yCursor = (rects[0].top + rects[0].height / 2 - caja.top) / escala + BAJO_CENTRO;

    // Cronograma: llega al primero en 0.5 s, 0.7 s quieto en cada uno, 0.5 s de viaje, sale en 0.6 s.
    paradas = [{ t: 0, x: centros[0] - MARGEN }];
    let t = VIAJE;
    centros.forEach((x, i) => {
      if (i > 0) t += VIAJE;
      paradas.push({ t, x }, { t: t + QUIETO, x });
      t += QUIETO;
    });
    paradas.push({ t: t + SALIDA, x: centros[centros.length - 1] + MARGEN });
    paradas.push({ t: 6.8, x: centros[centros.length - 1] + MARGEN });
  }

  function cuadro(ahora: number) {
    const t = ((ahora - inicio) / 1000) % CICLO;
    const vis = visibilidad(t);
    const x = t >= 6.8 ? paradas[0].x : xEn(t);
    cursor.style.opacity = String(vis);
    cursor.style.transform = `translate(${x - 3}px, ${yCursor - 2}px)`;

    iconos.forEach((icono, i) => {
      const d = (x - centros[i]) / 150;
      const g = Math.exp(-d * d * 2.2) * vis;
      const s = 1 + 0.55 * g;
      icono.style.transform = `translateY(${-14 * g}px) scale(${s})`;
      icono.style.zIndex = String(Math.round(g * 100));
      const tip = tooltips[i];
      tip.style.opacity = String(clamp((g - 0.55) / 0.3));
      tip.style.transform = `translateX(-50%) translateY(${-8 * g}px) scale(${1 / s})`;
    });
    raf = requestAnimationFrame(cuadro);
  }

  return {
    start() {
      if (raf) return;
      medir();
      inicio = performance.now();
      raf = requestAnimationFrame(cuadro);
    },
    stop() {
      cancelAnimationFrame(raf);
      raf = 0;
      cursor.style.opacity = "0";
      cursor.style.transform = "";
      iconos.forEach((icono, i) => {
        icono.style.transform = "";
        icono.style.zIndex = "";
        tooltips[i].style.opacity = "0";
        tooltips[i].style.transform = "translateX(-50%)";
      });
    },
  };
}
