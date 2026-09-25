import { redirect } from "next/navigation";
import { buscarLocal } from "@/lib/locales";
import { clienteActual, toquePendienteActual } from "@/lib/sesion-cliente";
import { VistaRegistro } from "./VistaRegistro";

export const metadata = { title: "Creá tu tarjeta" };

export default async function Registro() {
  const toque = await toquePendienteActual();
  if (!toque) redirect("/aviso?m=toque_vencido");

  const local = await buscarLocal(toque.localSlug);
  if (!local) redirect("/aviso?m=local_inactivo");

  // Si este celular ya tiene tarjeta, no hace falta registrarse.
  if (await clienteActual()) redirect(`/t/${local.slug}`);

  return <VistaRegistro local={local} />;
}
