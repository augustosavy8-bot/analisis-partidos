import { notFound, redirect } from "next/navigation";
import { buscarLocal } from "@/lib/locales";
import { clienteActual, toquePendienteActual } from "@/lib/sesion-cliente";
import { CabeceraLocal } from "@/components/CabeceraLocal";
import { FormRecuperar } from "./FormRecuperar";
import { Superficie } from "@/components/app/Superficie";

export const metadata = { title: "Recuperá tu tarjeta" };

export default async function Recuperar({ searchParams }: PageProps<"/recuperar">) {
  const { l } = await searchParams;
  const toque = await toquePendienteActual();
  const local = await buscarLocal(toque?.localSlug ?? (typeof l === "string" ? l : ""));
  if (!local) notFound();
  if (await clienteActual()) redirect(`/t/${local.slug}`);

  return (
    <div className="pt-app flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="px-1">
          <CabeceraLocal local={local} />
        </div>
        <div className="pt-subir mt-8 px-1">
          <h1 className="pt-app-titulo text-pt-ink">Recuperá tu tarjeta</h1>
          <p className="mt-1.5 pt-app-texto text-pt-ink-2">
            ¿Cambiaste de celular o borraste los datos del navegador? Ingresá tu WhatsApp y seguís sumando donde lo dejaste.
          </p>
        </div>
        {toque ? (
          <Superficie className="mt-6 p-5">
            <FormRecuperar slug={local.slug} />
          </Superficie>
        ) : (
          // Sin toque del llavero no se recupera (protege la tarjeta de quien sepa tu número).
          <Superficie className="mt-6 p-5 pt-app-texto text-pt-ink-2">
            Para recuperarla, pedile a quien te atiende en {local.nombre} que apoye el llavero en tu celular. Cuando se abra
            la pantalla para crear la tarjeta, tocá <strong className="text-pt-ink">“Recuperala con tu WhatsApp”</strong> y poné tu
            WhatsApp.
          </Superficie>
        )}
      </main>
    </div>
  );
}
