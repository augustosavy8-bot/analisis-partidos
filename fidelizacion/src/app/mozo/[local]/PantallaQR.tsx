"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { salir } from "./actions";
import { Icono } from "@/components/Icono";

type QR = { jti: string; url: string; svg: string; renovarEn: string };
const ROTACION_MS = 30_000;

export function PantallaQR({ slug, nombre }: { slug: string; nombre: string }) {
  const [qr, setQr] = useState<QR | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const [usado, setUsado] = useState(false);
  const [error, setError] = useState(false);
  const [escaneos, setEscaneos] = useState(0);
  const pidiendo = useRef(false);

  const nuevo = useCallback(async () => {
    if (pidiendo.current) return;
    pidiendo.current = true;
    try {
      const r = await fetch("/api/mozo/qr", { cache: "no-store" });
      if (r.status === 401) {
        window.location.reload();
        return;
      }
      setQr(await r.json());
      setUsado(false);
      setError(false);
    } catch {
      setError(true);
    } finally {
      pidiendo.current = false;
    }
  }, []);

  const estadoRef = useRef<{ qr: QR | null; usado: boolean }>({ qr: null, usado: false });
  useEffect(() => {
    estadoRef.current = { qr, usado };
  }, [qr, usado]);

  // Primer QR, reloj y rotación cada 30 s.
  useEffect(() => {
    const inicio = setTimeout(() => void nuevo(), 0);
    const reloj = setInterval(() => {
      const t = Date.now();
      setAhora(t);
      const { qr: actual, usado: u } = estadoRef.current;
      if (actual && !u && t >= new Date(actual.renovarEn).getTime()) void nuevo();
    }, 250);
    return () => {
      clearTimeout(inicio);
      clearInterval(reloj);
    };
  }, [nuevo]);

  // ¿Ya lo escanearon? Consultamos cada 1,5 s.
  useEffect(() => {
    if (!qr || usado) return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/mozo/qr/estado?j=${qr.jti}`, { cache: "no-store" });
        const { usado: u } = await r.json();
        if (u) {
          setUsado(true);
          setEscaneos((n) => n + 1);
          try {
            navigator.vibrate?.(80);
          } catch {}
          setTimeout(() => void nuevo(), 1800);
        }
      } catch {}
    }, 1500);
    return () => clearInterval(t);
  }, [qr, usado, nuevo]);

  // Mantener la pantalla encendida mientras se muestra el QR.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const pedir = async () => {
      try {
        lock = await (navigator as Navigator & { wakeLock?: { request: (t: string) => Promise<typeof lock> } }).wakeLock?.request("screen") ?? null;
      } catch {}
    };
    void pedir();
    const alVolver = () => document.visibilityState === "visible" && void pedir();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      void lock?.release().catch(() => {});
    };
  }, []);

  const restante = qr ? Math.max(0, new Date(qr.renovarEn).getTime() - ahora) : ROTACION_MS;
  const fraccion = restante / ROTACION_MS;

  return (
    <div className="flex flex-1 flex-col items-center">
      <p className="flex items-center gap-1.5 text-sm text-stone-500">
        <Icono nombre="mozo" tamaño={16} />
        Turno de <strong className="text-stone-900">{nombre}</strong>
        {escaneos > 0 && ` · ${escaneos} ${escaneos === 1 ? "escaneo" : "escaneos"}`}
      </p>

      <div className="relative mt-6 w-full max-w-xs">
        <div className="aspect-square overflow-hidden rounded-3xl bg-white p-4 shadow-xl ring-1 ring-stone-200">
          {qr && !usado ? (
            <div
              className="anim-aparecer h-full w-full [&>svg]:h-full [&>svg]:w-full"
              aria-label="Código QR para sumar un punto"
              dangerouslySetInnerHTML={{ __html: qr.svg }}
            />
          ) : usado ? (
            <div className="anim-pop flex h-full w-full flex-col items-center justify-center rounded-2xl bg-emerald-500 text-white">
              <span className="text-7xl">✓</span>
              <span className="mt-2 text-lg font-semibold">¡Listo!</span>
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-stone-400">
              {error ? "Sin conexión. Reintentando…" : "Generando…"}
            </div>
          )}
        </div>
        {/* barra de tiempo */}
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full transition-[width] duration-300 ease-linear"
            style={{ width: `${(usado ? 0 : fraccion) * 100}%`, background: "var(--marca)" }}
          />
        </div>
      </div>

      <p className="mt-6 flex max-w-xs gap-2.5 text-left text-stone-600">
        <Icono nombre="qr" tamaño={20} className="mt-0.5 shrink-0" />
        {usado
          ? "El cliente ya lo escaneó. Generando uno nuevo…"
          : "Pedile al cliente que lo escanee con la cámara del celular. Cambia cada 30 segundos y sirve una sola vez."}
      </p>

      {error && (
        <button onClick={() => void nuevo()} className="mt-3 text-sm font-medium underline">
          Reintentar
        </button>
      )}

      <form action={salir.bind(null, slug)} className="mt-auto pt-10">
        <button className="text-sm text-stone-500 underline underline-offset-4">Terminar turno</button>
      </form>
    </div>
  );
}
