"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function secciones(personal: string) {
  return [
  { ruta: "", nombre: "Resumen" },
  { ruta: "/clientes", nombre: "Clientes" },
  { ruta: "/whatsapp", nombre: "WhatsApp" },
  { ruta: "/movimientos", nombre: "Movimientos" },
  { ruta: "/premios", nombre: "Premios" },
  { ruta: "/promos", nombre: "Promos" },
  { ruta: "/mozos", nombre: personal },
  { ruta: "/ajustes", nombre: "Ajustes" },
  ];
}

export function NavPanel({ slug, personal }: { slug: string; personal: string }) {
  const actual = usePathname();
  return (
    <nav className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
      <ul className="flex min-w-max gap-1">
        {secciones(personal).map((s) => {
          const href = `/panel/${slug}${s.ruta}`;
          const activa = s.ruta === "" ? actual === href : actual.startsWith(href);
          return (
            <li key={s.ruta}>
              <Link
                href={href}
                aria-current={activa ? "page" : undefined}
                className={`block rounded-full px-4 py-2 text-sm font-medium transition ${
                  activa ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-200/60"
                }`}
              >
                {s.nombre}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
