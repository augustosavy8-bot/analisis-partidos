"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icono, type NombreIcono } from "@/components/Icono";

function secciones(personal: string): { ruta: string; nombre: string; icono: NombreIcono }[] {
  return [
    { ruta: "", nombre: "Resumen", icono: "estadisticas" },
    { ruta: "/clientes", nombre: "Clientes", icono: "cliente" },
    { ruta: "/whatsapp", nombre: "WhatsApp", icono: "whatsapp" },
    { ruta: "/movimientos", nombre: "Movimientos", icono: "historial" },
    { ruta: "/premios", nombre: "Premios", icono: "premio" },
    { ruta: "/promos", nombre: "Promos", icono: "sumar-punto" },
    { ruta: "/mozos", nombre: personal, icono: "mozo" },
    { ruta: "/ajustes", nombre: "Ajustes", icono: "configuracion" },
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
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition ${
                  activa ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-200/60"
                }`}
              >
                <Icono nombre={s.icono} tamaño={16} />
                {s.nombre}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
