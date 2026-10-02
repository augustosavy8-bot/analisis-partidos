import { requerirLocal, fechaHora } from "@/lib/panel";
import { alcanceBilleteras } from "@/lib/wallet/alcance";
import { Tarjeta, Titulo, Vacio } from "@/components/Panel";
import { Insignia } from "@/components/app/Superficie";
import { textoAlcance, type MensajeLocal } from "@/lib/mensajes";
import { FormMensaje } from "./FormMensaje";
import { MejorarPlan } from "@/components/app/MejorarPlan";
import { accesoDelLocal } from "@/lib/facturacion/acceso-servidor";
import { puedeUsar } from "@/lib/facturacion/acceso";

export const metadata = { title: "Mensajes" };

export default async function Mensajes({ params }: PageProps<"/panel/[local]/mensajes">) {
  const { local: slug } = await params;
  const { db, admin, local } = await requerirLocal(slug);
  const [{ data: proximo }, { data: historial }, destinatarios, { data: limite }] = await Promise.all([
    admin.rpc("proximo_mensaje_local", { p_local_id: local.id }),
    db
      .from("mensajes_local")
      .select("id, titulo, texto, estado, google_enviados, google_fallidos, apple_pases, created_at")
      .eq("local_id", local.id)
      .order("created_at", { ascending: false })
      .limit(30),
    alcanceBilleteras(local.id),
    db.from("locales").select("horas_entre_mensajes").eq("id", local.id).single(),
  ]);
  const horas: number = limite?.horas_entre_mensajes ?? 24;
  const mensajes = (historial ?? []) as MensajeLocal[];
  const habilitado = puedeUsar(await accesoDelLocal(local.id), "mensajes");

  return (
    <>
      <Titulo detalle="Llegan como notificación a quienes tienen tu tarjeta en Apple Wallet o Google Wallet.">Mensajes</Titulo>

      {!habilitado && (
        <MejorarPlan titulo="Los mensajes a clientes son del plan Pro" className="mb-4">
          Avisá promos y novedades con una notificación en la tarjeta de la Wallet de tus clientes.
        </MejorarPlan>
      )}
      <Tarjeta className={`mb-4 ${habilitado ? "" : "hidden"}`}>
        <h2 className="pt-app-seccion text-pt-ink">Enviar mensaje a clientes</h2>
        <p className="mb-4 mt-1 pt-app-detalle text-pt-ink-2">
          {horas === 0
            ? "Sin límite de mensajes. Igual, mandá sólo lo importante para no cansar a tus clientes."
            : horas === 24
              ? "Un mensaje por día, para no cansar a tus clientes."
              : `Un mensaje cada ${horas} horas, para no cansar a tus clientes.`}{" "}
          Ideal para avisar una promo o una novedad del local.
        </p>
        <FormMensaje
          slug={slug}
          comercio={local.nombre}
          logo={local.logo_url}
          destinatarios={destinatarios}
          proximo={proximo ? fechaHora(proximo, local.zona_horaria) : null}
          horas={horas}
          enviando={mensajes.some((m) => m.estado === "enviando")}
        />
      </Tarjeta>

      <h2 className="pt-app-seccion mb-3 mt-7 text-pt-ink">Mensajes enviados</h2>
      {mensajes.length === 0 ? (
        <Vacio titulo="Todavía no mandaste mensajes" ilustracion={false}>
          Cuando mandes uno, lo vas a ver acá con la cantidad de clientes a los que les llegó.
        </Vacio>
      ) : (
        <Tarjeta className="overflow-hidden !p-0">
          <ul className="divide-y divide-pt-border">
            {mensajes.map((m) => (
              <li key={m.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-[15px] font-semibold text-pt-ink">{m.titulo}</p>
                  <span className="shrink-0 pt-app-detalle tabular-nums text-pt-ink-2">{fechaHora(m.created_at, local.zona_horaria)}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-line text-[15px] text-pt-ink">{m.texto}</p>
                <p className="mt-2 flex flex-wrap items-center gap-2 pt-app-detalle text-pt-ink-2">
                  {m.estado === "error" ? <Insignia tono="error">Error</Insignia> : m.estado === "enviando" ? <Insignia tono="aviso">Enviando</Insignia> : <Insignia tono="acento">Enviado</Insignia>}
                  {textoAlcance(m)}
                </p>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </>
  );
}
