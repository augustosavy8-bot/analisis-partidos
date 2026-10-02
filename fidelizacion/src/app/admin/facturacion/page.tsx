import Link from "next/link";
import { requerirSuperadmin } from "@/lib/admin";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { Tarjeta, Titulo } from "@/components/Panel";
import { formatearPesos } from "@/lib/facturacion/dinero";
import { BotonAccion, FormAdmin, claseCampo } from "./Componentes";
import { consultarPago, correrConciliacion, resolverArrepentimiento } from "./actions";
import { Subnav } from "./Subnav";
import { EstadoConfig } from "./EstadoConfig";

export const metadata = { title: "Facturación" };

const ESTADOS: Record<string, string> = {
  cortesia: "Cortesía",
  trialing: "En prueba",
  pending: "Confirmando",
  authorized: "Activa",
  past_due: "Pago pendiente",
  paused: "Pausada",
  cancelled: "Cancelada",
};
const TONO: Record<string, string> = {
  authorized: "bg-emerald-50 text-emerald-800",
  trialing: "bg-sky-50 text-sky-800",
  past_due: "bg-red-50 text-red-700",
  paused: "bg-amber-50 text-amber-800",
  cortesia: "bg-violet-50 text-violet-800",
};

const haceDias = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export default async function FacturacionAdmin() {
  await requerirSuperadmin();
  const db = crearClienteAdmin();
  const hace30 = haceDias(30);
  const [{ data: comercios }, { data: subs }, { data: cuotas }, { data: pagosKit }, { count: aDespachar }, { count: eventosMal }, { data: arrepentimientos }] = await Promise.all([
    db.from("comercios").select("id, nombre, created_at").order("created_at", { ascending: false }),
    db.from("suscripciones").select("comercio_id, estado, precio_centavos, current_period_end, cortesia_hasta, created_at, planes!suscripciones_plan_id_fkey(nombre)").order("created_at", { ascending: false }),
    db.from("pagos_suscripcion").select("monto_centavos").eq("estado_pago", "approved").gte("fecha_pago", hace30),
    db.from("pagos").select("monto_centavos, reembolsado_centavos").eq("estado", "approved").gte("created_at", hace30),
    db.from("pedidos").select("id", { count: "exact", head: true }).in("estado", ["pagado", "preparando"]),
    db.from("eventos_pago").select("id", { count: "exact", head: true }).is("procesado_en", null),
    db.from("solicitudes_arrepentimiento").select("id, codigo, nombre, email, tipo, referencia, motivo, created_at").eq("estado", "nueva").order("created_at"),
  ]);

  // La suscripción que cuenta de cada comercio: la no cancelada, o la última.
  const porComercio = new Map<string, NonNullable<typeof subs>[number]>();
  for (const s of subs ?? []) {
    const actual = porComercio.get(s.comercio_id);
    if (!actual || (actual.estado === "cancelled" && s.estado !== "cancelled")) porComercio.set(s.comercio_id, s);
  }
  const vigentes = [...porComercio.values()];
  const cuenta = (e: string) => vigentes.filter((s) => s.estado === e).length;
  const mrr = vigentes.filter((s) => s.estado === "authorized" || s.estado === "past_due").reduce((t, s) => t + (s.precio_centavos ?? 0), 0);
  const enPrueba = vigentes.filter((s) => s.estado === "trialing").reduce((t, s) => t + (s.precio_centavos ?? 0), 0);
  const cobrado =
    (cuotas ?? []).reduce((t, c) => t + c.monto_centavos, 0) + (pagosKit ?? []).reduce((t, p) => t + p.monto_centavos - p.reembolsado_centavos, 0);
  const canceladas30 = (subs ?? []).filter((s) => s.estado === "cancelled" && s.created_at >= hace30 && s.precio_centavos).length;

  return (
    <>
      <Titulo accion={<BotonAccion accion={correrConciliacion}>Conciliar con MP ahora</BotonAccion>}>Facturación</Titulo>
      <Subnav actual="/admin/facturacion" />
      <EstadoConfig />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Dato etiqueta="Ingreso mensual (MRR)" valor={formatearPesos(mrr)} detalle={`+ ${formatearPesos(enPrueba)} cuando terminen las pruebas`} />
        <Dato etiqueta="Cobrado 30 días" valor={formatearPesos(cobrado)} detalle="cuotas + kits (neto de reembolsos)" />
        <Dato etiqueta="Activas / en prueba" valor={`${cuenta("authorized")} / ${cuenta("trialing")}`} detalle={`${cuenta("cortesia")} en cortesía`} />
        <Dato etiqueta="Pago pendiente" valor={String(cuenta("past_due"))} detalle={`${cuenta("paused")} pausadas · ${canceladas30} canceladas (30 d)`} />
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <Link href="/admin/facturacion/pedidos" className={`rounded-lg px-3 py-2 ${aDespachar ? "bg-amber-50 text-amber-900" : "bg-stone-100 text-stone-600"}`}>
          {aDespachar ?? 0} pedidos para despachar →
        </Link>
        <Link href="/admin/facturacion/eventos" className={`rounded-lg px-3 py-2 ${eventosMal ? "bg-red-50 text-red-800" : "bg-stone-100 text-stone-600"}`}>
          {eventosMal ?? 0} eventos sin procesar →
        </Link>
      </div>

      {(arrepentimientos ?? []).length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-widest text-red-700">Botón de arrepentimiento: pedidos sin resolver</h2>
          <Tarjeta className="!p-0 overflow-hidden border-red-200">
            <ul className="divide-y divide-stone-100 text-sm">
              {(arrepentimientos ?? []).map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                  <span className="font-mono font-semibold">{a.codigo}</span>
                  <span className="min-w-0 flex-1">
                    {a.nombre} · {a.email} · {a.tipo === "pedido" ? `pedido ${a.referencia ?? ""}` : "suscripción"}
                    {a.motivo && <span className="block text-xs text-stone-500">{a.motivo}</span>}
                  </span>
                  <span className="text-xs text-stone-500">{a.created_at.slice(0, 10)}</span>
                  <BotonAccion accion={resolverArrepentimiento.bind(null, a.id)}>Resuelta</BotonAccion>
                </li>
              ))}
            </ul>
          </Tarjeta>
          <p className="mt-2 text-xs text-stone-500">Hay que responder al email y devolver el dinero (Pedidos → Reembolsar, o cancelar la suscripción y reembolsar en MP).</p>
        </>
      )}

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-widest text-stone-500">Comercios</h2>
      <Tarjeta className="!p-0 overflow-hidden">
        <ul className="divide-y divide-stone-100">
          {(comercios ?? []).map((c) => {
            const s = porComercio.get(c.id);
            const plan = (s?.planes as unknown as { nombre: string } | null)?.nombre;
            return (
              <li key={c.id}>
                <Link href={`/admin/facturacion/${c.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-stone-50">
                  <span className="min-w-0 flex-1 font-medium">{c.nombre}</span>
                  {s ? (
                    <>
                      <span className="text-sm text-stone-500">{plan}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONO[s.estado] ?? "bg-stone-100 text-stone-600"}`}>{ESTADOS[s.estado] ?? s.estado}</span>
                      <span className="w-24 text-right text-sm tabular-nums">{s.precio_centavos ? formatearPesos(s.precio_centavos) : "—"}</span>
                    </>
                  ) : (
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">Sin suscripción</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </Tarjeta>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-widest text-stone-500">Consultar un pago en MP</h2>
      <Tarjeta>
        <FormAdmin accion={consultarPago} boton="Consultar">
          <input name="payment_id" inputMode="numeric" placeholder="Número de operación" className={claseCampo} />
        </FormAdmin>
      </Tarjeta>
    </>
  );
}

function Dato({ etiqueta, valor, detalle }: { etiqueta: string; valor: string; detalle?: string }) {
  return (
    <Tarjeta className="!p-4">
      <p className="text-sm text-stone-500">{etiqueta}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{valor}</p>
      {detalle && <p className="mt-1 text-xs text-stone-500">{detalle}</p>}
    </Tarjeta>
  );
}
