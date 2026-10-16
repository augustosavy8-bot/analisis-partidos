import { requerirLocal } from "@/lib/panel";
import { Titulo } from "@/components/Panel";
import { premiosDelLocal } from "@/lib/tarjeta";
import { coloresTarjeta } from "@/lib/colores";
import { alcanceBilleteras } from "@/lib/wallet/alcance";
import { EditorDiseno } from "./EditorDiseno";
import { MejorarPlan } from "@/components/app/MejorarPlan";
import { accesoDelLocal } from "@/lib/facturacion/acceso-servidor";
import { puedeUsar } from "@/lib/facturacion/acceso";
import { coloresClub, nombreClub } from "@/lib/socios";

/** Fondo y acento de la tarjeta de socio (lo guardado o lo por defecto). */
function colorClub(local: Parameters<typeof coloresClub>[0]) {
  const c = coloresClub(local);
  return { fondo: c.primario, acento: c.secundario };
}

export const metadata = { title: "Diseño de tarjeta" };

export default async function Diseno({ params }: PageProps<"/panel/[local]/diseno">) {
  const { local: slug } = await params;
  const { db, local } = await requerirLocal(slug);
  const [premios, alcance, acceso, { data: idsSocios }, { count: llaverosSocio }] = await Promise.all([
    premiosDelLocal(local.id),
    alcanceBilleteras(local.id),
    accesoDelLocal(local.id),
    db.rpc("panel_socios", { p_local_id: local.id }),
    db.from("chips").select("id", { count: "exact", head: true }).eq("local_id", local.id).eq("da_socio", true),
  ]);
  // Club de socios: la sección aparece si el local tiene llavero de socios o ya tiene socios.
  const conClub = ((idsSocios as string[] | null)?.length ?? 0) > 0 || (llaverosSocio ?? 0) > 0;
  const club = conClub ? { nombre: local.club_nombre ?? "", porDefecto: nombreClub({ ...local, club_nombre: null }), ...colorClub(local) } : null;
  // Punto de partida: lo que hoy usan las tarjetas (lo guardado o lo calculado).
  const colores = coloresTarjeta(local);
  const premio = premios[0] ? { nombre: premios[0].nombre, puntos: premios[0].puntos_necesarios } : null;

  return (
    <>
      <Titulo detalle="Cómo se ve tu tarjeta en Apple Wallet y Google Wallet.">Diseño de tarjeta</Titulo>
      {acceso.limites && !acceso.limites.diseno && puedeUsar(acceso, "editar_programa") && (
        <MejorarPlan titulo="Tu logo e imágenes en la tarjeta son del plan Pro" className="mb-4">
          Con tu plan podés elegir los colores. Pasá a Pro para subir tu logo, el ícono y la imagen de la tarjeta.
        </MejorarPlan>
      )}
      <EditorDiseno
        slug={slug}
        comercio={local.nombre}
        premio={premio}
        alcance={alcance}
        club={club}
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
