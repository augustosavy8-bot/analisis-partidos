import type { Metadata } from "next";
import { connection } from "next/server";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { Boton } from "@/components/landing/Boton";
import { Etiqueta } from "@/components/landing/Section";
import { Icono } from "@/components/Icono";
import { configFacturacion, planesPublicos, productosPublicos } from "@/lib/facturacion/catalogo";
import { beneficiosPlan } from "@/lib/facturacion/planes";
import { formatearPesos } from "@/lib/facturacion/dinero";

export const metadata: Metadata = {
  title: "Precios",
  description: "Planes de POINT para tu local: Básico y Pro, con 14 días de prueba gratis. Kit de chips NFC incluido en la tienda.",
};

/** Precios: los planes y el kit salen de la base (se editan desde /admin). */
export default async function Precios() {
  // Se arma en cada visita: los precios se editan desde /admin y tienen que verse al instante.
  await connection();
  const [planes, productos, config] = await Promise.all([planesPublicos(), productosPublicos(), configFacturacion()]);
  const destacado = planes.length > 1 ? planes[planes.length - 1].codigo : null;
  const diasPrueba = Math.max(0, ...planes.map((p) => p.diasPrueba));

  return (
    <>
      <Nav />
      <main className="bg-pt-bg">
        <section className="mx-auto max-w-[1280px] px-5 pb-16 pt-32 md:px-8 md:pt-40">
          <Etiqueta>Precios</Etiqueta>
          <h1 className="pt-display mt-4 max-w-[760px] text-pt-ink">Un precio simple por mes.</h1>
          {diasPrueba > 0 && (
            <p className="pt-lead mt-5 max-w-[620px] text-pt-ink-2">
              Probalo {diasPrueba} días gratis. Cargás la tarjeta para activar la prueba y el primer cobro llega recién el día{" "}
              {diasPrueba + 1}. Cancelás cuando quieras desde tu panel.
            </p>
          )}

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {planes.map((plan) => {
              const oscuro = plan.codigo === destacado;
              return (
                <article
                  key={plan.id}
                  className={`flex flex-col rounded-[28px] p-7 md:p-9 ${oscuro ? "bg-pt-ink text-white" : "bg-pt-pure text-pt-ink ring-1 ring-inset ring-pt-border"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="pt-h2">{plan.nombre}</h2>
                    {oscuro && <span className="rounded-full bg-pt-accent px-3 py-1 pt-label text-pt-ink">Recomendado</span>}
                  </div>
                  {plan.descripcion && <p className={`pt-body mt-2 ${oscuro ? "text-white/70" : "text-pt-ink-2"}`}>{plan.descripcion}</p>}
                  <p className="mt-6 flex items-baseline gap-2">
                    <span className="pt-display tabular-nums">{formatearPesos(plan.precioCentavos)}</span>
                    <span className={`pt-ui ${oscuro ? "text-white/60" : "text-pt-ink-3"}`}>/ mes</span>
                  </p>
                  <ul className="mt-7 grid gap-3">
                    {beneficiosPlan(plan.limites).map((b) => (
                      <li key={b} className="flex items-start gap-3 pt-body">
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${oscuro ? "bg-pt-accent text-pt-ink" : "bg-pt-accent-soft text-pt-accent-ink"}`}
                          aria-hidden
                        >
                          <Icono nombre="check" tamaño={13} trazo={2.6} />
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-9">
                    <Boton href={`/sumate?plan=${plan.codigo}`} variante={oscuro ? "oscuro" : "primario"} className="w-full">
                      {plan.diasPrueba > 0 ? `Probar ${plan.diasPrueba} días gratis` : `Elegir ${plan.nombre}`}
                    </Boton>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="mt-5 pt-ui text-pt-ink-3">Precios en pesos argentinos, finales. Débito automático con tarjeta de crédito o débito vía Mercado Pago.</p>
        </section>

        {productos.length > 0 && (
          <section className="border-t border-pt-border bg-pt-pure">
            <div className="mx-auto max-w-[1280px] px-5 py-16 md:px-8 md:py-24">
              <Etiqueta>Chips NFC</Etiqueta>
              <h2 className="pt-h1 mt-4 max-w-[640px] text-pt-ink">Los llaveros para tu equipo.</h2>
              <p className="pt-body mt-3 max-w-[560px] text-pt-ink-2">
                Se compran una sola vez desde tu panel, después de activar tu cuenta.
              </p>
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {productos.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-4 rounded-[20px] bg-pt-bg p-5">
                    <div className="min-w-0">
                      <p className="pt-ui font-semibold text-pt-ink">{p.nombre}</p>
                      {p.descripcion && <p className="pt-ui text-pt-ink-2">{p.descripcion}</p>}
                    </div>
                    <p className="shrink-0 pt-h3 tabular-nums text-pt-ink">{formatearPesos(p.precioCentavos)}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-4 pt-ui text-pt-ink-3">
                Envío a todo el país: {formatearPesos(config.costoEnvioCentavos)}. O retiralo sin cargo en {config.direccionRetiro}.
              </p>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
