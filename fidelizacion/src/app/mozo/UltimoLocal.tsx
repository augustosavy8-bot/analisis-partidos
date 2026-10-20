"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { claseBoton } from "@/components/app/Boton";

const CLAVE = "pt-mozo-local";

function crudo(): string | null {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

function leer(v: string | null): { slug: string; nombre: string } | null {
  try {
    const d = JSON.parse(v ?? "null");
    return d && typeof d.slug === "string" && typeof d.nombre === "string" ? d : null;
  } catch {
    return null;
  }
}

/** Botón al último local con el que se entró al QR desde este celular. */
export function UltimoLocal() {
  const v = useSyncExternalStore(() => () => {}, crudo, () => null);
  const ultimo = leer(v);
  if (!ultimo) return null;
  return (
    <Link href={`/mozo/${ultimo.slug}`} className={claseBoton("primario", "md", "mt-6 w-full")}>
      Entrar a {ultimo.nombre}
    </Link>
  );
}

/** Lo pone /mozo/<local>: la próxima vez que entren desde la home, queda a un toque. */
export function RecordarLocal({ slug, nombre }: { slug: string; nombre: string }) {
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ slug, nombre }));
    } catch {}
  }, [slug, nombre]);
  return null;
}
