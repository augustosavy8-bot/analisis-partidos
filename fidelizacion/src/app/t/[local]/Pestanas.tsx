"use client";

import { useSyncExternalStore } from "react";
import { TabBar } from "@/components/app/TabBar";
import type { NombreIcono } from "@/components/Icono";

export type Pestana = { clave: string; nombre: string; icono: NombreIcono; contenido: React.ReactNode; marca?: boolean };

// La pestaña vive en el hash (#premios): el botón "atrás" vuelve a la anterior
// y los links internos (href="#premios") cambian de pestaña sin JavaScript extra.
const suscribir = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const leerHash = () => window.location.hash.slice(1);

export function Pestanas({ pestanas }: { pestanas: Pestana[] }) {
  const hash = useSyncExternalStore(suscribir, leerHash, () => "");
  const activa = pestanas.find((p) => p.clave === hash) ?? pestanas[0];

  return (
    <>
      {pestanas.map((p) => (
        <div key={p.clave} hidden={p !== activa} className={p === activa ? "pt-subir" : undefined}>
          {p.contenido}
        </div>
      ))}
      <TabBar
        etiqueta="Secciones de tu tarjeta"
        items={pestanas.map((p) => ({
          clave: p.clave,
          nombre: p.nombre,
          icono: p.icono,
          marca: p.marca,
          activa: p === activa,
          alTocar: () => {
            if (p === activa) return window.scrollTo({ top: 0 });
            window.location.hash = p === pestanas[0] ? "" : p.clave;
            window.scrollTo({ top: 0 });
          },
        }))}
      />
    </>
  );
}
