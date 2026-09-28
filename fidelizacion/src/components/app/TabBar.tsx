"use client";

import Link from "next/link";
import { Icono, type NombreIcono } from "@/components/Icono";

export type ItemTab = {
  clave: string;
  nombre: string;
  icono: NombreIcono;
  activa: boolean;
  /** Link (navega) o acción (cambia de pestaña / abre una hoja). */
  href?: string;
  alTocar?: () => void;
  /** Punto de aviso (ej. hay un premio para canjear). */
  marca?: boolean;
};

/** Barra de pestañas inferior estilo iOS: vidrio claro, ícono + nombre, activa en tinta. */
export function TabBar({ items, etiqueta, className = "" }: { items: ItemTab[]; etiqueta: string; className?: string }) {
  return (
    <nav
      aria-label={etiqueta}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-pt-border/80 bg-pt-pure/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 ${className}`}
    >
      <ul className="mx-auto flex h-pt-tabbar max-w-md items-stretch">
        {items.map((it) => {
          const contenido = (
            <>
              <span className="relative">
                <Icono nombre={it.icono} tamaño={24} trazo={it.activa ? 2.1 : 1.8} />
                {it.marca && <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-pt-accent ring-2 ring-pt-pure" aria-hidden />}
              </span>
              <span className="text-[10.5px] font-semibold tracking-[0.01em]">{it.nombre}</span>
            </>
          );
          const clase = `flex h-full w-full flex-col items-center justify-center gap-1 transition-[color,transform] duration-150 active:scale-95 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-pt-accent-dark ${
            it.activa ? "text-pt-ink" : "text-pt-ink-2 hover:text-pt-ink"
          }`;
          return (
            <li key={it.clave} className="flex-1">
              {it.href ? (
                <Link href={it.href} className={clase} aria-current={it.activa ? "page" : undefined}>
                  {contenido}
                </Link>
              ) : (
                <button type="button" onClick={it.alTocar} className={clase} aria-current={it.activa ? "page" : undefined}>
                  {contenido}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
