import Link from "next/link";
import { requerirLocal } from "@/lib/panel";
import { Titulo, Vacio } from "@/components/Panel";
import { env } from "@/lib/env";
import { esSegmento, haceCuanto, SEGMENTOS, type Segmento } from "@/lib/reactivar";
import { textoCumple } from "@/lib/promos";
import { ListaWhatsapp, type FilaReactivar } from "./ListaWhatsapp";

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

  const chip = (activo: boolean) =>
    `rounded-full px-3 py-1.5 text-sm whitespace-nowrap ${activo ? "bg-stone-900 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200"}`;

  return (
    <>
      <Titulo>Reactivar por WhatsApp</Titulo>
      <p className="-mt-3 mb-4 text-sm text-stone-500">
        Elegí a quién escribirle. Cada botón abre WhatsApp con el mensaje listo: lo mandás vos, desde tu número.
      </p>

      <div className="-mx-4 mb-3 overflow-x-auto px-4 [scrollbar-width:none]">
        <div className="flex min-w-max gap-2">
          {(Object.keys(SEGMENTOS) as Segmento[]).map((s) => (
            <Link key={s} href={`/panel/${slug}/whatsapp?s=${s}`} className={chip(s === segmento)}>
              {SEGMENTOS[s].titulo}
            </Link>
          ))}
        </div>
      </div>
      {conf.valores.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {conf.valores.map((v) => (
            <Link key={v} href={`/panel/${slug}/whatsapp?s=${segmento}&v=${v}`} className={chip(v === valor)}>
              {conf.etiquetaValor(v)}
            </Link>
          ))}
        </div>
      )}
      <p className="mb-4 text-sm text-stone-600">
        {conf.descripcion(valor)} <strong>{filas.filter((f) => !f.no_contactar).length}</strong>{" "}
        {filas.length === 1 ? "cliente" : "clientes"}.
      </p>

      {filas.length === 0 ? (
        <Vacio>
          {segmento === "cumple" && local.puntos_cumple === 0
            ? "Nadie en esta lista. Activá el regalo de cumple en Promos para que los clientes carguen su cumple."
            : "No hay clientes en esta lista por ahora."}
        </Vacio>
      ) : (
        <ListaWhatsapp
          key={segmento}
          slug={slug}
          segmento={segmento}
          plantillaGuardada={local.plantillas_whatsapp?.[segmento] ?? null}
          local={local.nombre}
          link={`${env.appUrl}/t/${slug}`}
          filas={filas}
        />
      )}
      <p className="mt-3 text-xs text-stone-500">
        Escribí sólo a quien te dio su WhatsApp para la tarjeta, sin mandar muchos mensajes seguidos. Si alguien te pide
        que no le escribas más, tocá “No escribir más”.
      </p>
    </>
  );
}
