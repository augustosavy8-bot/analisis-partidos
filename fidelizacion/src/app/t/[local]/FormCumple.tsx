"use client";

import { Mascota } from "@/components/app/Mascota";
import { useActionState, useEffect } from "react";
import { guardarCumple, type EstadoCumple } from "./actions";
import { SelectorCumple } from "@/components/SelectorCumple";
import { BotonMarca, ErrorForm } from "@/components/Campo";
import { Superficie } from "@/components/app/Superficie";
import { avisar } from "@/components/app/Toasts";

export function FormCumple({ slug, puntos }: { slug: string; puntos: number }) {
  const [estado, accion, pendiente] = useActionState<EstadoCumple, FormData>(guardarCumple.bind(null, slug), {});
  useEffect(() => {
    if (estado.ok) avisar("¡Listo! Guardamos tu cumple");
  }, [estado.ok]);
  if (estado.ok) return null;
  return (
    <Superficie as="form" className="mt-5 space-y-3 p-5">
      <div className="flex items-center gap-3">
        <Mascota estado="cumple" tamaño={64} />
        <div>
          <p className="pt-app-seccion text-pt-ink">¿Cuándo es tu cumple?</p>
          <p className="mt-1 pt-app-detalle text-pt-ink-2">
            {puntos > 0
              ? `La semana de tu cumple te regalamos ${puntos} puntos en tu visita. Se carga una sola vez.`
              : "Así te saludamos ese día. No hace falta el año."}
          </p>
        </div>
      </div>
      <SelectorCumple requerido />
      <ErrorForm mensaje={estado.error} />
      <BotonMarca formAction={accion} pendiente={pendiente}>
        Guardar mi cumple
      </BotonMarca>
    </Superficie>
  );
}
