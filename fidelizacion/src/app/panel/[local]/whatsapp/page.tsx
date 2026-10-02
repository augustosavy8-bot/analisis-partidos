import Link from "next/link";
import { requerirLocal } from "@/lib/panel";
import { Titulo, Vacio } from "@/components/Panel";
import { env } from "@/lib/env";
import { esSegmento, haceCuanto, SEGMENTOS, type Segmento } from "@/lib/reactivar";
import { textoCumple } from "@/lib/promos";
import { ListaWhatsapp, type FilaReactivar } from "./ListaWhatsapp";
import { BotonLink, claseChip } from "@/components/app/Boton";

export const metadata = { title: "WhatsApp" };

type Fila = Omit<FilaReactivar, "detalle"> & {
  visitas: number;
  ultima_visita: string | null;
  cumple_dia: number | null;
  cumple_mes: number | null;
};

export default async function Whatsapp({ params, searchParams }: PageProps<"/panel/[local]/whatsapp">) {
  const { local: slug } = await params;
  const sp = await searchParams;
  const segmento: Segmento = esSegmento(sp.s) ? sp.s : "inactivos";
  const conf = SEGMENTOS[segmento];
  const valorPedido = Number(sp.v);
  const valor = conf.valores.includes(valorPedido) ? valorPedido : conf.porDefecto;

  const { db, local } = await requerirLocal(slug);
  const { data, error } = await db.rpc("panel_reactivar", { p_local_id: local.id, p_segmento: segmento, p_valor: valor });
  if (error) throw new Error(error.message);

  const filas: FilaReactivar[] = ((data ?? []) as Fila[]).map((f) => {
    const pts = `${f.puntos} ${f.puntos === 1 ? "punto" : "puntos"}`;
    const faltan = f.premio_puntos != null ? f.premio_puntos - f.puntos : null;
    const detalle =
      segmento === "inactivos"
        ? `Última visita ${f.ultima_visita ? haceCuanto(f.ultima_visita) : "—"} · ${pts}`
        : segmento === "cerca"
          ? `${pts} · le ${faltan === 1 ? "falta 1" : `faltan ${faltan}`} para ${f.premio_nombre}`
          : segmento === "premio"
            ? `${pts} · puede canjear ${f.premio_nombre}`
            : `Cumple el ${textoCumple(f.cumple_dia!, f.cumple_mes!)} · ${pts}`;
    return { ...f, detalle };
  });

  const chip = claseChip;

  return (
    <>
      <Titulo detalle="Elegí a quién escribirle. Cada botón abre WhatsApp con el mensaje listo: lo mandás vos, desde tu número.">
        Reactivar por WhatsApp
      </Titulo>

      <div className="-mx-4 mb-2 overflow-x-auto px-4 py-1 [scrollbar-width:none]">
        <div className="flex min-w-max gap-2">
          {(Object.keys(SEGMENTOS) as Segmento[]).map((s) => (
            <Link key={s} href={`/panel/${slug}/whatsapp?s=${s}`} className={chip(s === segmento)}>
              {SEGMENTOS[s].titulo}
            </Link>
          ))}
        </div>
      </div>
      {conf.valores.length > 0 && (
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none]">
          {conf.valores.map((v) => (
            <Link key={v} href={`/panel/${slug}/whatsapp?s=${segmento}&v=${v}`} className={chip(v === valor)}>
              {conf.etiquetaValor(v)}
            </Link>
          ))}
        </div>
      )}
      <p className="mb-4 pt-app-detalle text-pt-ink-2">
        {conf.descripcion(valor)} <strong>{filas.filter((f) => !f.no_contactar).length}</strong>{" "}
        {filas.length === 1 ? "cliente" : "clientes"}.
      </p>

      {filas.length === 0 ? (
        segmento === "cumple" && local.puntos_cumple === 0 ? (
          <Vacio
            titulo="Nadie en esta lista"
            accion={
              <BotonLink href={`/panel/${slug}/promos`} variante="primario">
                Activar regalo de cumple
              </BotonLink>
            }
          >
            Activá el regalo de cumple para que los clientes carguen su fecha.
          </Vacio>
        ) : (
          <Vacio titulo="Nadie en esta lista por ahora" ilustracion={false}>
            Probá con otra lista o volvé en unos días.
          </Vacio>
        )
      ) : (
        <ListaWhatsapp
          key={segmento}
          slug={slug}
          segmento={segmento}
          plantillaGuardada={local.plantillas_whatsapp?.[segmento] ?? null}
          iaDias={segmento === "inactivos" && env.iaConfigurada ? valor : null}
          local={local.nombre}
          link={`${env.appUrl}/t/${slug}`}
          filas={filas}
        />
      )}
      <p className="mt-3 pt-app-detalle text-pt-ink-2">
        Escribí sólo a quien te dio su WhatsApp para la tarjeta, sin mandar muchos mensajes seguidos. Si alguien te pide
        que no le escribas más, tocá “No escribir más”.
      </p>
    </>
  );
}
