"use client";

import { useState, useTransition } from "react";
import { cambiarResumenSemanal } from "./actions";
import { avisar } from "@/components/app/Toasts";
import { Tarjeta } from "@/components/Panel";

/** Interruptor del mail de los lunes (visitas, nuevos, los que no vuelven, cumpleaños). */
export function ResumenSemanal({ slug, recibe }: { slug: string; recibe: boolean }) {
  const [activo, setActivo] = useState(recibe);
  const [pendiente, start] = useTransition();
  return (
    <Tarjeta className="mt-4">
      <label className="flex cursor-pointer items-start gap-3">
        <span className="min-w-0 flex-1">
          <span className="block pt-app-seccion text-pt-ink">Resumen semanal por mail</span>
          <span className="mt-1 block pt-app-detalle text-pt-ink-2">
            Los lunes a la mañana: visitas, clientes nuevos, canjes, quién más sumó y los clientes que no vuelven.
          </span>
        </span>
        <input
          type="checkbox"
          className="mt-1 size-5 accent-pt-ink"
          checked={activo}
          disabled={pendiente}
          onChange={(e) => {
            const valor = e.target.checked;
            setActivo(valor);
            start(async () => {
              const r = await cambiarResumenSemanal(slug, valor);
              if (r.error) setActivo(!valor);
              avisar(r.error ?? (valor ? "Te va a llegar el resumen los lunes" : "Listo, no te llega más el resumen"), r.error ? "error" : "ok");
            });
          }}
        />
      </label>
    </Tarjeta>
  );
}
