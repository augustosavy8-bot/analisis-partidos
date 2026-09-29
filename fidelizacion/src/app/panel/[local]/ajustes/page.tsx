import Link from "next/link";
import { requerirLocal } from "@/lib/panel";
import { Tarjeta, Titulo } from "@/components/Panel";
import { FormAjustes } from "./FormAjustes";
import { FormIcono } from "./FormIcono";
import { fuenteIcono } from "@/lib/icono";
import { Icono } from "@/components/Icono";

export const metadata = { title: "Ajustes" };

export default async function Ajustes({ params }: PageProps<"/panel/[local]/ajustes">) {
  const { local: slug } = await params;
  const { local } = await requerirLocal(slug);
  return (
    <>
      <Titulo detalle="Reglas de puntos y datos del local.">Ajustes</Titulo>
      <FormAjustes local={local} />
      <FormIcono
        slug={slug}
        comercio={local.nombre}
        colorPrimario={local.color_primario}
        fuente={fuenteIcono(local).tipo}
        vistaPrevia={`/t/${slug}/icono?s=174&v=${encodeURIComponent(`${local.icono_url ?? ""}|${local.logo_url ?? ""}|${local.color_primario}`)}`}
      />
      <Tarjeta className="mt-4 overflow-hidden !pb-0">
        <h2 className="pt-app-seccion text-pt-ink">Links útiles</h2>
        <ul className="-mx-5 mt-2 divide-y divide-pt-border border-t border-pt-border">
          {[
            { href: `/t/${slug}`, texto: "Tarjeta de los clientes", detalle: `/t/${slug}` },
            { href: `/mozo/${slug}`, texto: "QR de respaldo para tu equipo", detalle: `/mozo/${slug}` },
            { href: "/panel/nueva-contrasena", texto: "Cambiar mi contraseña", detalle: "Tu cuenta" },
          ].map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="flex items-center gap-3 px-5 py-3 transition-colors duration-150 hover:bg-pt-bg">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium text-pt-ink">{l.texto}</span>
                  <span className="block truncate pt-app-detalle text-pt-ink-2">{l.detalle}</span>
                </span>
                <Icono nombre="chevron" tamaño={18} className="text-pt-ink-2" />
              </Link>
            </li>
          ))}
        </ul>
      </Tarjeta>
    </>
  );
}
