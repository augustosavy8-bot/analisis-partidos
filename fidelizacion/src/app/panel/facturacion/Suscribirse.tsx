"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import { Icono } from "@/components/Icono";
import { formatearPesos } from "@/lib/facturacion/dinero";
import { suscribirse } from "./actions";

export type PlanOpcion = {
  codigo: string;
  nombre: string;
  precioCentavos: number;
  diasPrueba: number;
  beneficios: string[];
};

let mpIniciado = false;

/**
 * Elegir plan + cargar la tarjeta. El formulario de tarjeta es de Mercado Pago
 * (Card Payment Brick): el número de la tarjeta viaja directo del navegador a
 * MP, que nos devuelve un token de un solo uso. Nuestro servidor nunca ve la
 * tarjeta (así no entramos en el alcance más pesado de PCI).
 */
export function Suscribirse({
  comercioId,
  planes,
  planInicial,
  email,
  publicKey,
  hoy,
}: {
  comercioId: string;
  planes: PlanOpcion[];
  planInicial: string;
  email: string;
  publicKey: string;
  /** Fecha de hoy (del servidor) para calcular el día del primer cobro. */
  hoy: string;
}) {
  const router = useRouter();
  const [codigo, setCodigo] = useState(planes.some((p) => p.codigo === planInicial) ? planInicial : planes[0]?.codigo);
  const [error, setError] = useState<string | null>(null);
  // Un token de tarjeta sirve una sola vez: si algo falla, el formulario se vuelve a montar vacío.
  const [intento, setIntento] = useState(0);
  const [listo, setListo] = useState(false);
  const enviando = useRef(false);
  // Email del pagador en Mercado Pago (puede no ser el de la cuenta de Point).
  // En pruebas tiene que ser el del usuario de prueba comprador. Ref: el brick
  // puede quedarse con una versión vieja de onSubmit.
  const [emailPagador, setEmailPagador] = useState(email);
  const emailRef = useRef(email);

  useEffect(() => {
    if (!mpIniciado) {
      initMercadoPago(publicKey, { locale: "es-AR" });
      mpIniciado = true;
    }
  }, [publicKey]);

  const plan = planes.find((p) => p.codigo === codigo) ?? planes[0];
  const primerCobro = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" }).format(
    new Date(new Date(hoy).getTime() + plan.diasPrueba * 86_400_000),
  );

  async function alEnviar(formData: { token: string }) {
    if (enviando.current) return;
    enviando.current = true;
    setError(null);
    try {
      const r = await suscribirse({ comercioId, plan: plan.codigo, token: formData.token, email: emailRef.current });
      if (r.ok) {
        router.push(r.destino);
        return;
      }
      setError(r.error);
      setListo(false);
      setIntento((n) => n + 1);
    } finally {
      enviando.current = false;
    }
  }

  return (
    <div className="grid gap-6">
      <fieldset className="grid gap-3">
        <legend className="pt-app-seccion mb-2 text-pt-ink">1. Elegí tu plan</legend>
        {planes.map((p) => {
          const activo = p.codigo === codigo;
          return (
            <label
              key={p.codigo}
              className={`flex cursor-pointer gap-3 rounded-pt-card bg-pt-pure p-4 ring-inset transition ${activo ? "ring-2 ring-pt-ink" : "ring-1 ring-pt-border hover:ring-pt-ink-3"}`}
            >
              <input
                type="radio"
                name="plan"
                value={p.codigo}
                checked={activo}
                onChange={() => {
                  setCodigo(p.codigo);
                  setListo(false);
                  setIntento((n) => n + 1);
                }}
                className="mt-1 h-4 w-4 accent-pt-ink"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-[17px] font-semibold text-pt-ink">{p.nombre}</span>
                  <span className="tabular-nums text-pt-ink">
                    <strong className="text-[17px]">{formatearPesos(p.precioCentavos)}</strong>
                    <span className="text-[13px] text-pt-ink-2"> / mes</span>
                  </span>
                </span>
                <ul className="mt-2 grid gap-1">
                  {p.beneficios.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-[13px] leading-snug text-pt-ink-2">
                      <Icono nombre="check" tamaño={14} className="mt-0.5 shrink-0 text-pt-accent-ink" />
                      {b}
                    </li>
                  ))}
                </ul>
                {p.diasPrueba > 0 && <span className="mt-2 block text-[12px] font-semibold text-pt-accent-ink">{p.diasPrueba} días de prueba gratis</span>}
              </span>
            </label>
          );
        })}
      </fieldset>

      <section>
        <h2 className="pt-app-seccion mb-2 text-pt-ink">2. Tu tarjeta</h2>
        <p className="mb-3 flex gap-2 rounded-pt-sm bg-pt-accent-soft px-4 py-3 text-[14px] leading-snug text-pt-accent-ink">
          <Icono nombre="check" tamaño={18} className="mt-0.5 shrink-0" />
          {plan.diasPrueba > 0 ? (
            <span>
              <strong>Hoy no se cobra nada.</strong> Tu prueba gratis dura {plan.diasPrueba} días: el {primerCobro} se debita{" "}
              {formatearPesos(plan.precioCentavos)} y después cada mes. Podés cancelar antes sin costo.
            </span>
          ) : (
            <span>
              Se debita {formatearPesos(plan.precioCentavos)} por mes. Podés cancelar cuando quieras.
            </span>
          )}
        </p>
        {error && (
          <p className="mb-3 rounded-pt-sm bg-red-50 px-4 py-3 text-[14px] text-red-800" role="alert">
            {error}
          </p>
        )}
        <label className="mb-3 grid gap-1.5">
          <span className="text-[14px] font-medium text-pt-ink">Email de tu cuenta de Mercado Pago</span>
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            value={emailPagador}
            onChange={(e) => {
              setEmailPagador(e.target.value);
              emailRef.current = e.target.value.trim();
            }}
            className="h-12 rounded-pt-sm border border-pt-border bg-pt-pure px-4 text-[16px] text-pt-ink outline-none focus:border-pt-ink"
          />
          <span className="text-[12px] text-pt-ink-3">Es el email con el que Mercado Pago te avisa de cada cobro.</span>
        </label>
        <div className="min-h-[320px]">
          {!listo && <p className="py-6 text-center text-[14px] text-pt-ink-2">Cargando el formulario seguro de Mercado Pago…</p>}
          <CardPayment
            key={`${plan.codigo}-${intento}`}
            locale="es-AR"
            initialization={{ amount: plan.precioCentavos / 100, payer: { email } }}
            customization={{
              paymentMethods: { maxInstallments: 1, types: { excluded: ["prepaid_card"] } },
              visual: { texts: { formSubmit: plan.diasPrueba > 0 ? "Empezar prueba gratis" : "Suscribirme" } },
            }}
            onReady={() => setListo(true)}
            onError={(e) => console.error("Brick de tarjeta", e)}
            onSubmit={alEnviar}
          />
        </div>
        <p className="mt-3 text-center text-[12px] text-pt-ink-3">
          Pagos procesados por Mercado Pago. Point no guarda los datos de tu tarjeta. Mercado Pago puede hacer un cargo mínimo para
          validarla, que se devuelve al instante.
        </p>
      </section>
    </div>
  );
}
