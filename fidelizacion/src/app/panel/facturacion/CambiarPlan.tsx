"use client";

import { useTransition } from "react";
import { Boton } from "@/components/app/Boton";
import { CartelPromo, PrecioPlan } from "./PrecioPlan";
import { Icono } from "@/components/Icono";
import { avisar } from "@/components/app/Toasts";
import { confirmar } from "@/components/app/Dialogos";
import { formatearPesos } from "@/lib/facturacion/dinero";
import { cambiarPlan } from "./actions";

export type OpcionPlan = {
  codigo: string;
  nombre: string;
  precioCentavos: number;
  precioListaCentavos?: number | null;
  promoTexto?: string | null;
  beneficios: string[];
  tienePromos: boolean;
};

/**
 * Cambio de plan. El texto del diálogo explica qué pasa (cuándo, cuánto) antes
 * de confirmar; la decisión real (inmediato o al fin del período) la toma el servidor.
 */
export function CambiarPlan({
  comercioId,
  actual,
  planes,
  enPrueba,
  finPeriodo,
  programado,
}: {
  comercioId: string;
  actual: { codigo: string; nombre: string; precioCentavos: number; tienePromos: boolean };
  planes: OpcionPlan[];
  enPrueba: boolean;
  finPeriodo: string | null;
  programado: { codigo: string; nombre: string } | null;
}) {
  const [pendiente, iniciar] = useTransition();

  async function elegir(p: OpcionPlan) {
    const sube = p.precioCentavos >= actual.precioCentavos;
    const pierdePromos = actual.tienePromos && !p.tienePromos;
    const cuando = enPrueba || sube ? "El cambio es inmediato." : `Seguís con ${actual.nombre} hasta el ${finPeriodo ?? "fin del período"}; ese día pasás a ${p.nombre}.`;
    const cobro = enPrueba
      ? `Cuando termine la prueba se debitan ${formatearPesos(p.precioCentavos)} por mes.`
      : `Desde el próximo débito se cobran ${formatearPesos(p.precioCentavos)} por mes. No se cobra nada extra por los días que quedan de este mes.`;
    const ok = await confirmar({
      titulo: `¿Pasar al plan ${p.nombre}?`,
      texto: `${cuando} ${cobro}${pierdePromos ? " Las promos y los regalos de bienvenida y cumpleaños se apagan al pasar de plan." : ""}`,
      confirmar: `Pasar a ${p.nombre}`,
      cancelar: "Volver",
    });
    if (!ok) return;
    iniciar(async () => {
      const r = await cambiarPlan({ comercioId, plan: p.codigo });
      avisar(r.ok ? r.mensaje : r.error, r.ok ? "ok" : "error");
    });
  }

  function anular() {
    iniciar(async () => {
      const r = await cambiarPlan({ comercioId, plan: actual.codigo });
      avisar(r.ok ? r.mensaje : r.error, r.ok ? "ok" : "error");
    });
  }

  return (
    <div className="grid gap-3">
      {programado && (
        <div className="flex flex-col gap-3 rounded-pt-card bg-amber-50 p-4 text-amber-900 ring-1 ring-inset ring-amber-200 sm:flex-row sm:items-center">
          <p className="flex-1 text-[14px] leading-snug">
            El {finPeriodo} pasás al plan <strong>{programado.nombre}</strong>. Hasta ese día seguís con {actual.nombre}.
          </p>
          <Boton variante="secundario" tamaño="sm" pendiente={pendiente} onClick={anular}>
            Quedarme en {actual.nombre}
          </Boton>
        </div>
      )}
      {planes
        .filter((p) => p.codigo !== actual.codigo && p.codigo !== programado?.codigo)
        .map((p) => (
          <div key={p.codigo} className="rounded-pt-card bg-pt-pure p-4 ring-1 ring-inset ring-pt-border">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[17px] font-semibold text-pt-ink">{p.nombre}</span>
              <PrecioPlan precioCentavos={p.precioCentavos} precioListaCentavos={p.precioListaCentavos} />
            </div>
            <CartelPromo texto={p.promoTexto} precioCentavos={p.precioCentavos} precioListaCentavos={p.precioListaCentavos} />
            <ul className="mt-2 grid gap-1">
              {p.beneficios.map((b) => (
                <li key={b} className="flex items-start gap-2 text-[13px] leading-snug text-pt-ink-2">
                  <Icono nombre="check" tamaño={14} className="mt-0.5 shrink-0 text-pt-accent-ink" />
                  {b}
                </li>
              ))}
            </ul>
            <Boton
              className="mt-3 w-full"
              variante={p.precioCentavos > actual.precioCentavos ? "primario" : "secundario"}
              pendiente={pendiente}
              onClick={() => elegir(p)}
            >
              Pasar a {p.nombre}
            </Boton>
          </div>
        ))}
    </div>
  );
}
