import { notFound, redirect } from "next/navigation";
import { buscarLocal, estiloMarca } from "@/lib/locales";
import { clienteActual, toquePendienteActual } from "@/lib/sesion-cliente";
import { CabeceraLocal } from "@/components/CabeceraLocal";
import { FormRecuperar } from "./FormRecuperar";

export const metadata = { title: "Recuperá tu tarjeta" };

export default async function Recuperar({ searchParams }: PageProps<"/recuperar">) {
  const { l } = await searchParams;
  const toque = await toquePendienteActual();
  const local = await buscarLocal(toque?.localSlug ?? (typeof l === "string" ? l : ""));
  if (!local) notFound();
  if (await clienteActual()) redirect(`/t/${local.slug}`);

  return (
    <main style={estiloMarca(local)} className="mx-auto w-full max-w-md flex-1 px-6 pb-10 pt-8">
      <CabeceraLocal local={local} />
      <div className="mt-10 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Recuperá tu tarjeta</h1>
        <p className="text-stone-600">¿Cambiaste de celular o borraste los datos del navegador? Ingresá tu WhatsApp y seguís sumando donde lo dejaste.</p>
      </div>
      <div className="mt-8">
        <FormRecuperar slug={local.slug} />
      </div>
    </main>
  );
}
