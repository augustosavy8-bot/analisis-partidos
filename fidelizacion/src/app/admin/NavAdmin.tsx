"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icono, type NombreIcono } from "@/components/Icono";
import { BotonTema } from "@/components/app/BotonTema";
import { LogoPoint } from "@/components/MarcaPoint";
import { salir } from "../panel/ingresar/actions";

type Seccion = { href: string; nombre: string; icono: NombreIcono; principal?: boolean };

const SECCIONES: Seccion[] = [
  { href: "/admin", nombre: "Estado", icono: "estadisticas", principal: true },
  { href: "/admin/facturacion", nombre: "Facturación", icono: "wallet", principal: true },
  { href: "/admin/interesados", nombre: "Interesados", icono: "cliente", principal: true },
  { href: "/admin/opiniones", nombre: "Opiniones", icono: "premio", principal: true },
  { href: "/admin/anuncio", nombre: "Mails", icono: "notificacion" },
  { href: "/admin/locales/nuevo", nombre: "Nuevo local", icono: "mas" },
  { href: "/panel", nombre: "Paneles", icono: "local" },
];

function activa(actual: string, href: string) {
  // /admin/locales/... (fichas de locales) cuenta como Estado, donde está la lista.
  if (href === "/admin") return actual === "/admin" || (actual.startsWith("/admin/locales/") && actual !== "/admin/locales/nuevo");
  return actual.startsWith(href);
}

/** Barra lateral del superadmin en escritorio. */
export function LateralAdmin({ email }: { email: string }) {
  const actual = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-stone-200 bg-white px-3 py-4 md:flex">
      <Link href="/admin" className="mb-6 flex items-center gap-2 px-2 font-semibold">
        <LogoPoint alto={26} />
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">Admin</span>
      </Link>
      <nav aria-label="Secciones del admin" className="flex flex-col gap-0.5 text-sm">
        {SECCIONES.map((s) => {
          const on = activa(actual, s.href);
          return (
            <Link
              key={s.href}
              href={s.href}
              aria-current={on ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${
                on ? "bg-stone-900 font-semibold text-white" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              }`}
            >
              <Icono nombre={s.icono} tamaño={18} />
              {s.nombre}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-stone-200 px-2 pt-3 text-sm text-stone-500">
        <p className="truncate" title={email}>
          {email}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <BotonTema />
          <form action={salir}>
            <button className="underline underline-offset-4">Salir</button>
          </form>
        </div>
      </div>
    </aside>
  );
}

/** Celular: cabecera chica arriba y barra abajo; la sección activa sube en un círculo. */
export function BarraAdmin({ email }: { email: string }) {
  const actual = usePathname();
  const [mas, setMas] = useState(false);

  const principales = SECCIONES.filter((s) => s.principal);
  const resto = SECCIONES.filter((s) => !s.principal);
  const enMas = resto.some((s) => activa(actual, s.href));
  const items: (Seccion & { esMas?: boolean })[] = [...principales, { href: "#mas", nombre: "Más", icono: "mas", esMas: true }];

  return (
    <div className="md:hidden">
      {mas && (
        <>
          <button aria-label="Cerrar menú" className="fixed inset-0 z-40 bg-black/20" onClick={() => setMas(false)} />
          <div className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl">
            {resto.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                onClick={() => setMas(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] ${activa(actual, s.href) ? "bg-stone-100 font-semibold" : "text-stone-700"}`}
              >
                <Icono nombre={s.icono} tamaño={18} /> {s.nombre}
              </Link>
            ))}
            <div className="mt-1 flex items-center gap-3 border-t border-stone-100 px-3 pt-3 pb-1 text-sm text-stone-500">
              <span className="min-w-0 flex-1 truncate">{email}</span>
              <BotonTema />
              <form action={salir}>
                <button className="underline underline-offset-4">Salir</button>
              </form>
            </div>
          </div>
        </>
      )}
      <nav
        aria-label="Secciones del admin"
        className="fixed inset-x-2 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-50 flex rounded-[22px] border border-stone-200 bg-white px-1 pt-2 pb-2 shadow-[0_6px_24px_rgba(0,0,0,0.12)]"
      >
        {items.map((s) => {
          const on = s.esMas ? mas || enMas : activa(actual, s.href) && !mas;
          const contenido = (
            <>
              {/* Activa: el ícono sube en un círculo que "muerde" el borde de la barra. */}
              <span
                className={`flex items-center justify-center rounded-full transition-all duration-200 ${
                  on
                    ? "-mt-8 mb-0.5 h-14 w-14 border-[5px] border-[var(--background)] bg-white text-stone-900 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]"
                    : "h-7 w-7 text-stone-500"
                }`}
              >
                <span className={on ? "flex h-9 w-9 items-center justify-center rounded-full bg-stone-900 text-white" : ""}>
                  <Icono nombre={s.icono} tamaño={on ? 18 : 21} />
                </span>
              </span>
              <span className={`mt-0.5 text-[11px] leading-tight ${on ? "font-bold text-stone-900" : "text-stone-500"}`}>{s.nombre}</span>
            </>
          );
          const clase = "flex min-w-0 flex-1 flex-col items-center";
          return s.esMas ? (
            <button key="mas" onClick={() => setMas((v) => !v)} aria-expanded={mas} className={clase}>
              {contenido}
            </button>
          ) : (
            <Link key={s.href} href={s.href} onClick={() => setMas(false)} aria-current={on ? "page" : undefined} className={clase}>
              {contenido}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
