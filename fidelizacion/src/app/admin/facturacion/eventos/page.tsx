import { requerirSuperadmin } from "@/lib/admin";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { fechaHora } from "@/lib/panel";
import { Tarjeta, Titulo, Vacio } from "@/components/Panel";
import { BotonAccion } from "../Componentes";
import { reprocesarEvento } from "../actions";
import { Subnav } from "../Subnav";

export const metadata = { title: "Eventos de pago" };
const TZ = "America/Argentina/Buenos_Aires";

/** Log crudo de webhooks de MP. Reprocesar es seguro: todo el procesamiento es idempotente. */
export default async function EventosAdmin({ searchParams }: PageProps<"/admin/facturacion/eventos">) {
  await requerirSuperadmin();
  const sp = await searchParams;
  const filtro = typeof sp.f === "string" ? sp.f : "problemas";
  let q = crearClienteAdmin()
    .from("eventos_pago")
    .select("id, topic, action, data_id, firma_valida, procesado_en, error, intentos, created_at")
    .order("id", { ascending: false })
    .limit(100);
  if (filtro === "problemas") q = q.or("procesado_en.is.null,error.not.is.null");
  const { data: eventos } = await q;

  return (
    <>
      <Titulo>Eventos de pago</Titulo>
      <Subnav actual="/admin/facturacion/eventos" />
      <p className="mb-4 text-sm text-stone-500">
        {filtro === "problemas" ? "Sin procesar o con error." : "Todos (últimos 100)."}{" "}
        <a href={filtro === "problemas" ? "?f=todos" : "?"} className="underline">
          {filtro === "problemas" ? "Ver todos" : "Ver sólo problemas"}
        </a>
        . Con firma inválida no se procesan (pueden ser de otra app o intentos de fraude).
      </p>
      {(eventos ?? []).length === 0 ? (
        <Vacio>Sin eventos para mostrar.</Vacio>
      ) : (
        <Tarjeta className="!p-0 overflow-hidden">
          <ul className="divide-y divide-stone-100 text-sm">
            {(eventos ?? []).map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                <span className="w-12 text-stone-400 tabular-nums">{e.id}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{e.topic ?? "?"}</span>
                  {e.action && <span className="text-stone-500"> · {e.action}</span>}
                  <span className="text-stone-500"> · {e.data_id}</span>
                  {e.error && <span className="block text-xs text-red-700">{e.error}</span>}
                </span>
                <span className="text-xs text-stone-500">{fechaHora(e.created_at, TZ)}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${!e.firma_valida ? "bg-red-50 text-red-700" : e.procesado_en ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
                  {!e.firma_valida ? "firma inválida" : e.procesado_en ? "procesado" : `pendiente (${e.intentos})`}
                </span>
                {e.firma_valida && <BotonAccion accion={reprocesarEvento.bind(null, e.id)}>Reprocesar</BotonAccion>}
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </>
  );
}
