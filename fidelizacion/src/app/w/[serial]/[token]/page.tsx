import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { tarjetaPorPase } from "@/lib/billetera";
import { premiosDelLocal, proximoPremio, tarjetaDelCliente } from "@/lib/tarjeta";
import { PointCard } from "@/components/landing/PointCard";
import { Aviso, Encabezado } from "@/components/app/Superficie";
import { BotonLink } from "@/components/app/Boton";
import { TemaLocal } from "@/components/app/TemaLocal";
import { INSIGNIA_SOCIO, varsTarjetaSocio } from "@/lib/socios";

export const metadata: Metadata = { title: "Mi tarjeta", robots: { index: false } };

/** Vista de sólo lectura de la tarjeta, abierta desde la billetera (sin cookie): nombre y puntos, sin historial. */
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
      <TemaLocal local={local} />
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Encabezado sobre="Hola," titulo={pase.nombre.split(" ")[0]} />
        {/* Socio del club: la tarjeta con los colores del club y la insignia. */}
        <div className="rounded-pt-lg shadow-pt-card-app" style={tarjeta.socio_desde ? varsTarjetaSocio(local) : undefined}>
          <PointCard
            comercio={local.nombre}
            inicial={local.nombre.charAt(0).toUpperCase()}
            logo={local.logo_url}
            puntos={tarjeta.puntos}
            meta={objetivo?.puntos_necesarios ?? null}
            premio={objetivo?.nombre.toLowerCase()}
            reflejo={false}
            socio={tarjeta.socio_desde ? INSIGNIA_SOCIO : undefined}
          />
        </div>

        {canjeables.length > 0 && (
          <Aviso tono="acento" icono="premio" className="mt-5">
            Ya podés canjear: <strong>{canjeables.map((p) => p.nombre).join(", ")}</strong>. Pedíselo al personal de {local.nombre} y canjealo desde tu tarjeta.
          </Aviso>
        )}

        {/* Sin historial: este link es el QR del pase y no se puede revocar (quien lo
            escanee lo tiene para siempre). El historial está en la tarjeta completa. */}

        <BotonLink href={`/t/${local.slug}`} variante="primario" tamaño="lg" className="mt-8">
          Abrir la tarjeta completa (para canjear)
        </BotonLink>
        <p className="mt-2 text-center pt-app-detalle text-pt-ink-2">Si te pide tus datos, tocá “Recuperala con tu WhatsApp”.</p>
      </main>
    </div>
  );
}
