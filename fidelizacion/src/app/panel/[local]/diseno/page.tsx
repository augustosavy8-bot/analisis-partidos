import { requerirLocal } from "@/lib/panel";
import { Titulo } from "@/components/Panel";
import { premiosDelLocal } from "@/lib/tarjeta";
import { coloresTarjeta } from "@/lib/colores";
import { alcanceBilleteras } from "@/lib/wallet/alcance";
import { EditorDiseno } from "./EditorDiseno";

export const metadata = { title: "Diseño de tarjeta" };

export default async function Diseno({ params }: PageProps<"/panel/[local]/diseno">) {
  const { local: slug } = await params;
  const { local } = await requerirLocal(slug);
  const [premios, alcance] = await Promise.all([premiosDelLocal(local.id), alcanceBilleteras(local.id)]);
  // Punto de partida: lo que hoy usan las tarjetas (lo guardado o lo calculado).
  const colores = coloresTarjeta(local);
  const premio = premios[0] ? { nombre: premios[0].nombre, puntos: premios[0].puntos_necesarios } : null;

  return (
    <>
      <Titulo detalle="Cómo se ve tu tarjeta en Apple Wallet y Google Wallet.">Diseño de tarjeta</Titulo>
      <EditorDiseno
        slug={slug}
        comercio={local.nombre}
        premio={premio}
        alcance={alcance}
        inicial={{
          fondo: colores.fondo,
          texto: colores.texto,
          etiqueta: colores.etiqueta,
          acento: local.color_secundario,
          programa: local.nombre_programa ?? "",
          textoDorso: local.texto_dorso ?? "",
          imagenes: { logo: local.logo_url, icono: local.icono_url, franja: local.franja_url },
        }}
      />
    </>
  );
}
