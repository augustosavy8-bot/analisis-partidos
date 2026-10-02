import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirSuperadmin } from "@/lib/admin";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { fechaHora } from "@/lib/panel";
import { Tarjeta, Titulo } from "@/components/Panel";
import { formatearPesos } from "@/lib/facturacion/dinero";
import { BotonAccion, FormAdmin, claseCampo } from "../Componentes";
import { guardarCortesia, guardarHorasMensajes, sincronizarSuscripcion } from "../actions";

export const metadata = { title: "Comercio" };
const TZ = "America/Argentina/Buenos_Aires";

export default async function ComercioAdmin({ params }: PageProps<"/admin/facturacion/[comercio]">) {
  const { comercio: id } = await params;
  await requerirSuperadmin();
  const db = crearClienteAdmin();
  const { data: comercio } = await db.from("comercios").select("id, nombre, razon_social, cuit, condicion_fiscal, email_facturacion, origen, created_at").eq("id", id).maybeSingle();
  if (!comercio) notFound();

  const [{ data: subs }, { data: locales }, { data: planes }, { data: pedidos }] = await Promise.all([
    db
      .from("suscripciones")
      .select("id, estado, mp_preapproval_id, mp_payer_email, precio_centavos, trial_ends_at, current_period_end, cortesia_hasta, past_due_desde, cancelada_en, created_at, planes!suscripciones_plan_id_fkey(codigo, nombre), programado:planes!suscripciones_plan_programado_id_fkey(nombre)")
      .eq("comercio_id", id)
      .order("created_at", { ascending: false }),
    db.from("locales").select("id, slug, nombre, horas_entre_mensajes").eq("comercio_id", id).order("created_at"),
    db.from("planes").select("codigo, nombre").order("orden"),
    db.from("pedidos").select("id, numero, estado, total_centavos, created_at").eq("comercio_id", id).order("created_at", { ascending: false }).limit(10),
  ]);
  const ids = (subs ?? []).map((s) => s.id);
  const [{ data: historial }, { data: cuotas }] = await Promise.all([
    db.from("historial_suscripcion").select("id, de_estado, a_estado, motivo, origen, created_at").in("suscripcion_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).order("created_at", { ascending: false }).limit(20),
    db.from("pagos_suscripcion").select("id, monto_centavos, estado, estado_pago, status_detail, intento, fecha_debito").in("suscripcion_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).order("fecha_debito", { ascending: false }).limit(12),
  ]);
  const vigente = (subs ?? []).find((s) => s.estado !== "cancelled") ?? null;
  const cortesia = vigente?.estado === "cortesia" ? vigente : null;
  const fecha = (iso: string | null) => (iso ? fechaHora(iso, TZ) : "—");

  return (
    <>
      <Link href="/admin/facturacion" className="text-sm text-stone-500">← Facturación</Link>
      <div className="mt-2">
        <Titulo detalle={[comercio.razon_social, comercio.cuit && `CUIT ${comercio.cuit}`, comercio.condicion_fiscal, comercio.email_facturacion].filter(Boolean).join(" · ") || undefined}>
          {comercio.nombre}
        </Titulo>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta>
          <p className="font-medium">Suscripciones</p>
          <ul className="mt-3 space-y-3 text-sm">
            {(subs ?? []).map((s) => {
              const plan = s.planes as unknown as { nombre: string } | null;
              const prog = s.programado as unknown as { nombre: string } | null;
              return (
                <li key={s.id} className="rounded-lg bg-stone-50 p-3">
                  <p className="font-medium">
                    {plan?.nombre} · {s.estado}
                    {s.precio_centavos ? ` · ${formatearPesos(s.precio_centavos)}` : ""}
                  </p>
                  <p className="text-xs text-stone-500">
                    Alta {fecha(s.created_at)}
                    {s.trial_ends_at && ` · prueba hasta ${fecha(s.trial_ends_at)}`}
                    {s.current_period_end && ` · período hasta ${fecha(s.current_period_end)}`}
                    {s.estado === "cortesia" && ` · cortesía ${s.cortesia_hasta ? `hasta ${fecha(s.cortesia_hasta)}` : "sin fin"}`}
                    {s.past_due_desde && ` · impaga desde ${fecha(s.past_due_desde)}`}
                    {s.cancelada_en && ` · cancelada ${fecha(s.cancelada_en)}`}
                    {prog && ` · pasa a ${prog.nombre} al fin del período`}
                  </p>
                  {s.mp_preapproval_id && (
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                      MP {s.mp_preapproval_id} · {s.mp_payer_email}
                      <BotonAccion accion={sincronizarSuscripcion.bind(null, s.mp_preapproval_id)}>Sincronizar con MP</BotonAccion>
                    </p>
                  )}
                </li>
              );
            })}
            {(subs ?? []).length === 0 && <li className="text-stone-500">Nunca tuvo suscripción.</li>}
          </ul>
        </Tarjeta>

        <Tarjeta>
          <p className="font-medium">Cortesía</p>
          <p className="mt-1 text-sm text-stone-500">
            {vigente && !cortesia
              ? "Tiene una suscripción paga vigente: para darle cortesía, primero tiene que cancelarla."
              : "Plan sin cargo. Dejá la fecha vacía para que no tenga fin."}
          </p>
          {(!vigente || cortesia) && (
            <FormAdmin accion={guardarCortesia.bind(null, comercio.id)} boton={cortesia ? "Guardar cortesía" : "Dar cortesía"} className="mt-3">
              <select name="plan" defaultValue={(cortesia?.planes as unknown as { codigo: string } | null)?.codigo ?? "pro"} className={claseCampo}>
                {(planes ?? []).map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              <label className="text-sm text-stone-600">
                Hasta (opcional)
                <input type="date" name="hasta" defaultValue={cortesia?.cortesia_hasta?.slice(0, 10) ?? ""} className={`${claseCampo} mt-1`} />
              </label>
            </FormAdmin>
          )}

          <p className="mt-6 font-medium">Mensajes por local</p>
          <p className="mt-1 text-sm text-stone-500">Horas mínimas entre mensajes a clientes (0 = sin límite).</p>
          {(locales ?? []).map((l) => (
            <FormAdmin key={l.id} accion={guardarHorasMensajes.bind(null, l.id)} className="mt-3">
              <label className="text-sm text-stone-600">
                <Link href={`/admin/locales/${l.slug}`} className="underline">{l.nombre}</Link>
                <input type="number" name="horas" min={0} max={720} defaultValue={l.horas_entre_mensajes} className={`${claseCampo} mt-1`} />
              </label>
            </FormAdmin>
          ))}
        </Tarjeta>

        <Tarjeta>
          <p className="font-medium">Cuotas</p>
          <ul className="mt-3 divide-y divide-stone-100 text-sm">
            {(cuotas ?? []).map((c) => (
              <li key={c.id} className="flex justify-between gap-3 py-2">
                <span>
                  {fecha(c.fecha_debito)} · {c.estado}
                  {c.estado_pago && ` / ${c.estado_pago}`}
                  {c.intento > 0 && ` · intento ${c.intento}`}
                  {c.status_detail && <span className="block text-xs text-stone-500">{c.status_detail}</span>}
                </span>
                <span className="tabular-nums">{formatearPesos(c.monto_centavos)}</span>
              </li>
            ))}
            {(cuotas ?? []).length === 0 && <li className="py-2 text-stone-500">Sin cuotas todavía.</li>}
          </ul>
        </Tarjeta>

        <Tarjeta>
          <p className="font-medium">Historial</p>
          <ul className="mt-3 divide-y divide-stone-100 text-sm">
            {(historial ?? []).map((h) => (
              <li key={h.id} className="py-2">
                <span className="font-medium">
                  {h.de_estado ? `${h.de_estado} → ` : ""}
                  {h.a_estado}
                </span>{" "}
                <span className="text-stone-500">· {h.origen} · {fecha(h.created_at)}</span>
                {h.motivo && <span className="block text-xs text-stone-500">{h.motivo}</span>}
              </li>
            ))}
          </ul>
          <p className="mt-6 font-medium">Pedidos</p>
          <ul className="mt-2 divide-y divide-stone-100 text-sm">
            {(pedidos ?? []).map((p) => (
              <li key={p.id} className="flex justify-between py-2">
                <span>
                  #{p.numero} · {p.estado}
                </span>
                <span className="tabular-nums">{formatearPesos(p.total_centavos)}</span>
              </li>
            ))}
            {(pedidos ?? []).length === 0 && <li className="py-2 text-stone-500">Sin pedidos.</li>}
          </ul>
        </Tarjeta>
      </div>
    </>
  );
}
