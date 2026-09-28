"use client";

import { useEffect, useRef, useState } from "react";
import { m, useScroll, useTransform } from "motion/react";
import { Etiqueta } from "./Section";
import { Reveal } from "./Reveal";

const METRICAS = [
  { etiqueta: "Clientes", valor: "1.284" },
  { etiqueta: "Visitas este mes", valor: "+18%" },
  { etiqueta: "Canjes", valor: "143" },
];

/** 14 — Panel: primera aparición del software B2B, sobre fondo oscuro. */
export function PanelDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const y = useTransform(scrollYProgress, [0, 1], [140, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.94, 1]);

  return (
    <section id="panel" className="scroll-mt-16 overflow-hidden bg-pt-ink text-white">
      <div className="mx-auto max-w-[1280px] px-5 pt-24 text-center md:px-8 md:pt-40">
        <Reveal className="flex flex-col items-center">
          <Etiqueta oscuro>Tu panel</Etiqueta>
          <h2 className="pt-display mt-4">Vos manejás las reglas.</h2>
        </Reveal>
      </div>

      <div ref={ref} className="relative mx-auto mt-16 max-w-[1100px] px-5 pb-24 md:mt-24 md:px-8 md:pb-40">
        <m.div style={{ y, scale }} className="relative">
          {/* Etiquetas alrededor (desktop) */}
          <Nota className="-left-10 top-[12%]">Creá recompensas</Nota>
          <Nota className="-right-10 top-[34%]">Mirá quién vuelve</Nota>
          <Nota className="-left-6 bottom-[14%]">Medí los canjes</Nota>

          {/* Mobile: más ancho que la pantalla (150vw, corrido -25vw) para que se lea como software real */}
          <div className="-mx-5 overflow-visible md:mx-0">
            <div className="w-[150vw] -translate-x-[16.67%] md:w-full md:translate-x-0">
              <EscalaFija ancho={1040}>
                <Dashboard />
              </EscalaFija>
            </div>
          </div>
        </m.div>

        {/* Mobile: métricas ampliadas debajo */}
        <div className="mt-12 space-y-8 md:hidden">
          {METRICAS.map((mt) => (
            <div key={mt.etiqueta} className="border-t border-white/10 pt-6">
              <p className="pt-label text-white/50">{mt.etiqueta}</p>
              <p className="pt-display mt-2">{mt.valor}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Dibuja el contenido a un ancho fijo de diseño y lo escala al ancho disponible. */
function EscalaFija({ ancho, children }: { ancho: number; children: React.ReactNode }) {
  const caja = useRef<HTMLDivElement>(null);
  const interior = useRef<HTMLDivElement>(null);
  const [medidas, setMedidas] = useState({ escala: 1, alto: 0 });
  useEffect(() => {
    const c = caja.current;
    const i = interior.current;
    if (!c || !i) return;
    const medir = () => {
      const escala = c.clientWidth / ancho;
      setMedidas({ escala, alto: i.offsetHeight * escala });
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(c);
    return () => ro.disconnect();
  }, [ancho]);
  return (
    <div ref={caja} style={{ height: medidas.alto || undefined }}>
      <div ref={interior} style={{ width: ancho, transform: `scale(${medidas.escala})`, transformOrigin: "top left" }}>
        {children}
      </div>
    </div>
  );
}

function Nota({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`absolute z-20 hidden rounded-full bg-[#1d211d]/90 px-4 py-2 pt-ui text-white/90 shadow-pt-product ring-1 ring-white/15 backdrop-blur lg:block ${className}`}>
      <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-pt-accent align-middle" />
      {children}
    </span>
  );
}

function Dashboard() {
  return (
    <div className="overflow-hidden rounded-pt-lg bg-pt-pure text-pt-ink shadow-[0_40px_120px_rgba(0,0,0,.45)] ring-1 ring-white/10">
      {/* Barra de ventana */}
      <div className="flex items-center gap-2 border-b border-pt-border bg-pt-bg px-5 py-3">
        <span className="h-3 w-3 rounded-full bg-[#E2E5E0]" />
        <span className="h-3 w-3 rounded-full bg-[#E2E5E0]" />
        <span className="h-3 w-3 rounded-full bg-[#E2E5E0]" />
        <span className="ml-4 pt-ui text-pt-ink-3">Café Aurora · Panel</span>
      </div>
      <div className="grid grid-cols-[200px_1fr]">
        <aside className="border-r border-pt-border bg-pt-bg p-5">
          {["Resumen", "Clientes", "Recompensas", "Equipo", "Ajustes"].map((s, i) => (
            <p key={s} className={`rounded-pt-sm px-3 py-2 pt-ui ${i === 0 ? "bg-pt-pure text-pt-ink shadow-pt-ui" : "text-pt-ink-2"}`}>
              {s}
            </p>
          ))}
        </aside>
        <div className="p-8">
          <div className="grid grid-cols-3 gap-4">
            {METRICAS.map((mt, i) => (
              <div key={mt.etiqueta} className="rounded-pt-card border border-pt-border p-5">
                <p className="pt-label text-pt-ink-3">{mt.etiqueta}</p>
                <p className={`mt-2 font-[family-name:var(--font-manrope)] text-[40px] font-semibold tracking-[-0.03em] ${i === 1 ? "text-pt-accent-dark" : ""}`}>
                  {mt.valor}
                </p>
              </div>
            ))}
          </div>
          <div className="my-8 h-px bg-pt-border" />
          <div className="grid grid-cols-3 gap-6">
            <Lista titulo="Clientes frecuentes" filas={[["Sofía G.", "12 visitas"], ["Martín R.", "9 visitas"], ["Lucía P.", "8 visitas"]]} />
            <Lista titulo="Últimas visitas" filas={[["Joaquín T.", "hace 5 min"], ["Ana B.", "hace 22 min"], ["Pedro L.", "hace 1 h"]]} />
            <Lista titulo="Recompensas" filas={[["Café gratis", "10 puntos"], ["Café + medialuna", "15 puntos"], ["Desayuno", "25 puntos"]]} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Lista({ titulo, filas }: { titulo: string; filas: [string, string][] }) {
  return (
    <div>
      <p className="pt-ui text-pt-ink">{titulo}</p>
      <ul className="mt-3 divide-y divide-pt-border">
        {filas.map(([a, b]) => (
          <li key={a} className="flex items-center justify-between py-2.5 pt-ui">
            <span className="text-pt-ink">{a}</span>
            <span className="text-pt-ink-3">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
