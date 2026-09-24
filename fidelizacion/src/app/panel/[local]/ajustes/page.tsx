import Link from "next/link";
import { requerirLocal } from "@/lib/panel";
import { Tarjeta, Titulo } from "@/components/Panel";
import { FormAjustes } from "./FormAjustes";

export const metadata = { title: "Ajustes" };

export default async function Ajustes({ params }: PageProps<"/panel/[local]/ajustes">) {
  const { local: slug } = await params;
  const { local } = await requerirLocal(slug);
  return (
    <>
      <Titulo>Ajustes</Titulo>
      <FormAjustes local={local} />
      <Tarjeta className="mt-4">
        <h2 className="font-medium">Links útiles</h2>
        <ul className="mt-2 space-y-1 text-sm">
          <li>
            Tarjeta de los clientes: <Link href={`/t/${slug}`} className="underline">/t/{slug}</Link>
          </li>
          <li>
            Tu cuenta: <Link href="/panel/nueva-contrasena" className="underline">cambiar mi contraseña</Link>
          </li>
          <li>
            QR de respaldo para mozos: <Link href={`/mozo/${slug}`} className="underline">/mozo/{slug}</Link>
          </li>
        </ul>
      </Tarjeta>
    </>
  );
}
