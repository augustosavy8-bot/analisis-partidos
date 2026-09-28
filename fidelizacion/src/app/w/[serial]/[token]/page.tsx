import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { tarjetaPorPase } from "@/lib/billetera";
import { formatearFecha, premiosDelLocal, proximoPremio, tarjetaDelCliente } from "@/lib/tarjeta";
import { PointCard } from "@/components/landing/PointCard";
import { Aviso, Encabezado, Lista, Seccion } from "@/components/app/Superficie";
import { BotonLink } from "@/components/app/Boton";
import { textoMovimiento } from "@/lib/movimientos";

export const metadata: Metadata = { title: "Mi tarjeta", robots: { index: false } };

/** Vista de sólo lectura de la tarjeta, abierta desde la billetera (sin cookie). */
export default async function Pase({ params }: PageProps<"/w/[serial]/[token]">) {
  const { serial, token } = await params;
  const pase = await tarjetaPorPase(serial, token);
  if (!pase) notFound();
  const { local } = pase;

  const [tarjeta, premios] = await Promise.all([tarjetaDelCliente(pase.clienteId, local.id), premiosDelLocal(local.id)]);
  if (!tarjeta) notFound();
  const objetivo = proximoPremio(premios, tarjeta.puntos);
  const canjeables = premios.filter((p) => tarjeta.puntos >= p.puntos_necesarios);

  return (
    <div className="pt-app flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Encabezado sobre="Hola," titulo={pase.nombre.split(" ")[0]} />
        <div className="rounded-pt-lg shadow-pt-card-app">
          <PointCard
            comercio={local.nombre}
            inicial={local.nombre.charAt(0).toUpperCase()}
            logo={local.logo_url}
            puntos={tarjeta.puntos}
            meta={objetivo?.puntos_necesarios ?? null}
            premio={objetivo?.nombre.toLowerCase()}
            reflejo={false}
          />
        </div>

        {canjeables.length > 0 && (
          <Aviso tono="acento" icono="premio" className="mt-5">
            Ya podés canjear: <strong>{canjeables.map((p) => p.nombre).join(", ")}</strong>. Pedíselo al personal de {local.nombre} y canjealo desde tu tarjeta.
          </Aviso>
        )}

        {tarjeta.movimientos.length > 0 && (
          <Seccion titulo="Últimos movimientos" className="!mt-7">
            <Lista>
              {tarjeta.movimientos.slice(0, 8).map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3 pt-app-detalle">
                  <span className="text-pt-ink">{textoMovimiento(m)}</span>
                  <span className="shrink-0 text-pt-ink-2">{formatearFecha(m.created_at, local.zona_horaria)}</span>
                </li>
              ))}
            </Lista>
          </Seccion>
        )}

        <BotonLink href={`/t/${local.slug}`} variante="primario" tamaño="lg" className="mt-8">
          Abrir la tarjeta completa (para canjear)
        </BotonLink>
        <p className="mt-2 text-center pt-app-detalle text-pt-ink-2">Si te pide tus datos, tocá “Recuperala con tu WhatsApp”.</p>
      </main>
    </div>
  );
}
