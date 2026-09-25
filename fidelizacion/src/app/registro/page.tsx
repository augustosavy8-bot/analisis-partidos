import { redirect } from "next/navigation";
import { buscarLocal, estiloMarca } from "@/lib/locales";
import { clienteActual, toquePendienteActual } from "@/lib/sesion-cliente";
import { CabeceraLocal } from "@/components/CabeceraLocal";
import { formasTermino } from "@/lib/terminos";
import { FormRegistro } from "./FormRegistro";

export const metadata = { title: "Creá tu tarjeta" };

export default async function Registro() {
  const toque = await toquePendienteActual();
  if (!toque) redirect("/aviso?m=toque_vencido");

  const local = await buscarLocal(toque.localSlug);
  if (!local) redirect("/aviso?m=local_inactivo");

  // Si este celular ya tiene tarjeta, no hace falta registrarse.
  if (await clienteActual()) redirect(`/t/${local.slug}`);

  return (
    <main style={estiloMarca(local)} className="mx-auto w-full max-w-md flex-1 px-6 pb-10 pt-8">
      <CabeceraLocal local={local} />
      <div className="mt-10 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--marca)" }}>
          {local.puntos_bienvenida > 0 ? `+${local.puntos_bienvenida + 1} puntos te esperan` : "+1 punto te espera"}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Creá tu tarjeta</h1>
        <p className="text-stone-600">Es una sola vez. La próxima, el {formasTermino(local.termino_personal).singular} apoya el llavero y sumás al toque.</p>
      </div>
      <div className="mt-8">
        <FormRegistro slug={local.slug} puntosCumple={local.puntos_cumple} />
      </div>
    </main>
  );
}
