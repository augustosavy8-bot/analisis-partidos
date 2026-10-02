"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { Icono, type NombreIcono } from "@/components/Icono";
import { TabBar } from "@/components/app/TabBar";

/** `absoluta`: la ruta no cuelga del local (por ejemplo, la facturación es del comercio). */
type SeccionPanel = { ruta: string; nombre: string; icono: NombreIcono; principal?: boolean; absoluta?: boolean };

function secciones(personal: string): SeccionPanel[] {
  return [
    { ruta: "", nombre: "Resumen", icono: "estadisticas", principal: true },
    { ruta: "/clientes", nombre: "Clientes", icono: "cliente", principal: true },
    { ruta: "/whatsapp", nombre: "WhatsApp", icono: "whatsapp", principal: true },
    { ruta: "/premios", nombre: "Premios", icono: "premio", principal: true },
    { ruta: "/movimientos", nombre: "Movimientos", icono: "historial" },
    { ruta: "/promos", nombre: "Promos", icono: "sumar-punto" },
    { ruta: "/mensajes", nombre: "Mensajes", icono: "notificacion" },
    { ruta: "/diseno", nombre: "Diseño", icono: "tarjeta" },
    { ruta: "/mozos", nombre: personal, icono: "mozo" },
    { ruta: "/ajustes", nombre: "Ajustes", icono: "configuracion" },
    { ruta: "/panel/kit", nombre: "Comprar chips", icono: "nfc", absoluta: true },
    { ruta: "/panel/facturacion", nombre: "Facturación", icono: "wallet", absoluta: true },
  ];
}

/** Navegación del panel: pestañas arriba en escritorio; tab bar + hoja "Más" en celu. */
export function NavPanel({ slug, personal, cuenta, vista }: { slug: string; personal: string; cuenta?: React.ReactNode; vista: "escritorio" | "movil" }) {
  const actual = usePathname();
  const hoja = useRef<HTMLDialogElement>(null);
  const todas = secciones(personal);
  const href = (s: SeccionPanel) => (s.absoluta ? s.ruta : `/panel/${slug}${s.ruta}`);
  const activa = (s: SeccionPanel) => (s.ruta === "" ? actual === href(s) : actual.startsWith(href(s)));
  const enMas = todas.some((s) => !s.principal && activa(s));

  if (vista === "escritorio") {
    return (
      // Las pestañas bajan a otra fila si no entran: con scroll horizontal oculto,
      // Ajustes / Comprar chips / Facturación quedaban fuera de la pantalla en notebooks.
      <nav aria-label="Secciones del panel" className="hidden md:block">
        <ul className="flex flex-wrap gap-1">
          {todas.map((s) => (
            <li key={s.ruta}>
              <Link
                href={href(s)}
                aria-current={activa(s) ? "page" : undefined}
                className={`flex h-pt-control-sm items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors duration-150 ${
                  activa(s) ? "bg-pt-ink text-white" : "text-pt-ink-2 hover:bg-pt-surface hover:text-pt-ink"
                }`}
              >
                <Icono nombre={s.icono} tamaño={16} />
                {s.nombre}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  // Celu: va fuera del header (un ancestro con backdrop-filter rompería el position: fixed).
  return (
    <>
      <TabBar
        etiqueta="Secciones del panel"
        className="md:hidden"
        items={[
          ...todas.filter((s) => s.principal).map((s) => ({ clave: s.ruta || "resumen", nombre: s.nombre, icono: s.icono, href: href(s), activa: activa(s) })),
          { clave: "mas", nombre: "Más", icono: "mas" as const, activa: enMas, alTocar: () => hoja.current?.showModal() },
        ]}
      />
      <dialog
        ref={hoja}
        aria-label="Más secciones"
        onClick={(e) => e.target === hoja.current && hoja.current?.close()}
        className="m-0 mt-auto w-full max-w-none bg-transparent p-0 backdrop:bg-pt-ink/40 backdrop:backdrop-blur-[2px] open:flex md:hidden"
      >
        <div className="pt-subir w-full rounded-t-pt-lg bg-pt-pure px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-pt-flotante">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-pt-border" aria-hidden />
          <ul className="divide-y divide-pt-border overflow-hidden rounded-pt-card bg-pt-bg">
            {todas
              .filter((s) => !s.principal)
              .map((s) => (
                <li key={s.ruta}>
                  <Link
                    href={href(s)}
                    onClick={() => hoja.current?.close()}
                    aria-current={activa(s) ? "page" : undefined}
                    className="flex items-center gap-3 px-4 py-3.5 text-[15px] font-medium text-pt-ink transition-colors duration-150 active:bg-pt-surface"
                  >
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full ${activa(s) ? "bg-pt-ink text-white" : "bg-pt-pure text-pt-ink"}`}>
                      <Icono nombre={s.icono} tamaño={18} />
                    </span>
                    <span className="flex-1">{s.nombre}</span>
                    <Icono nombre="chevron" tamaño={18} className="text-pt-ink-2" />
                  </Link>
                </li>
              ))}
          </ul>
          <div className="mt-3">{cuenta}</div>
        </div>
      </dialog>
    </>
  );
}
