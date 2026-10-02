import Link from "next/link";
import { LogoPoint } from "@/components/landing/LogoPoint";
import { Encabezado, Seccion, Superficie } from "@/components/app/Superficie";
import { BotonLink, claseBoton } from "@/components/app/Boton";
import { salir } from "../ingresar/actions";
import { Vacio } from "@/components/Panel";
import { Icono } from "@/components/Icono";
import { requerirUsuario } from "@/lib/panel";
import { env } from "@/lib/env";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { comercioDelUsuario, suscripcionVigente, type SuscripcionVigente } from "@/lib/facturacion/comercio";
import { completarRegistroPendiente, planElegidoAlRegistrarse } from "@/lib/facturacion/registro-servidor";
import { planesPublicos } from "@/lib/facturacion/catalogo";
import { beneficiosPlan } from "@/lib/facturacion/planes";
import { formatearPesos } from "@/lib/facturacion/dinero";
import { Suscribirse } from "./Suscribirse";
import { Gestionar } from "./Gestionar";
import { CambiarPlan } from "./CambiarPlan";
import { Toasts } from "@/components/app/Toasts";
import { Dialogos } from "@/components/app/Dialogos";

export const metadata = { title: "Facturación", robots: { index: false } };

const fecha = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(iso)) : null;

/** Una cuota mensual, en palabras. */
function estadoCuota(c: { estado: string; estado_pago: string | null }): { texto: string; tono: string } {
  if (c.estado_pago === "approved") return { texto: "Cobrado", tono: "text-pt-accent-ink" };
  if (c.estado === "recycling") return { texto: "Reintentando", tono: "text-amber-700" };
  if (c.estado_pago === "rejected") return { texto: "Rechazado", tono: "text-red-700" };
  if (c.estado === "scheduled") return { texto: "Programado", tono: "text-pt-ink-2" };
  return { texto: "En proceso", tono: "text-pt-ink-2" };
}

/** Cómo se lee el estado de la suscripción para el dueño del comercio. */
function describir(s: SuscripcionVigente): { titulo: string; detalle: string; tono: "ok" | "aviso" } {
  const precio = s.precioCentavos !== null ? formatearPesos(s.precioCentavos) : null;
  switch (s.estado) {
    case "cortesia":
      return {
        titulo: `Plan ${s.planNombre} · cortesía de Point`,
        detalle: s.cortesiaHasta ? `Sin cargo hasta el ${fecha(s.cortesiaHasta)}.` : "Sin cargo y sin fecha de fin.",
        tono: "ok",
      };
    case "trialing":
      return {
        titulo: `Plan ${s.planNombre} · prueba gratis`,
        detalle: `Tu prueba termina el ${fecha(s.trialEndsAt)}. Ese día se debitan ${precio} y después cada mes.`,
        tono: "ok",
      };
    case "authorized":
      return { titulo: `Plan ${s.planNombre} · activo`, detalle: `Próximo cobro: ${fecha(s.currentPeriodEnd)} (${precio}).`, tono: "ok" };
    case "pending":
      return { titulo: `Plan ${s.planNombre}`, detalle: "Estamos confirmando tu tarjeta con Mercado Pago. Esto tarda unos minutos.", tono: "aviso" };
    case "paused":
      return {
        titulo: `Plan ${s.planNombre} · pausado`,
        detalle:
          s.currentPeriodEnd && new Date(s.currentPeriodEnd) > new Date()
            ? `No se te cobra mientras esté pausado. Todo sigue funcionando hasta el ${fecha(s.currentPeriodEnd)}.`
            : "No se te cobra mientras esté pausado. El panel está restringido hasta que lo reactives.",
        tono: "aviso",
      };
    case "past_due":
      return {
        titulo: `Plan ${s.planNombre} · pago pendiente`,
        detalle: "No pudimos cobrar la última cuota. Mercado Pago lo reintenta durante unos días: revisá que la tarjeta tenga fondos o cambiala.",
        tono: "aviso",
      };
    case "cancelled":
      return {
        titulo: `Plan ${s.planNombre} · cancelado`,
        detalle: `No se te cobra más. Todo sigue funcionando hasta el ${fecha(s.currentPeriodEnd)}.`,
        tono: "aviso",
      };
    default:
      return { titulo: `Plan ${s.planNombre}`, detalle: "", tono: "aviso" };
  }
}

export default async function Facturacion({ searchParams }: PageProps<"/panel/facturacion">) {
  const { email } = await requerirUsuario();
  const creado = await completarRegistroPendiente();
  const sp = await searchParams;
  const comercio = await comercioDelUsuario(typeof sp.c === "string" ? sp.c : creado);

  if (!comercio) {
    return (
      <Marco>
        <Vacio titulo="Todavía no tenés un comercio" ilustracion={false}>
          Si ya confirmaste tu email y ves esto, escribinos y lo resolvemos. Si todavía no te registraste,{" "}
          <Link href="/sumate" className="underline underline-offset-4">
            creá tu cuenta
          </Link>
          .
        </Vacio>
      </Marco>
    );
  }

  const [suscripcion, { data: local }] = await Promise.all([
    suscripcionVigente(comercio.id),
    crearClienteAdmin().from("locales").select("slug").eq("comercio_id", comercio.id).order("created_at").limit(1).maybeSingle(),
  ]);

  // Cancelada (con días pagos por delante): puede volver a suscribirse con ?nueva=1.
  if (!suscripcion || (suscripcion.estado === "cancelled" && sp.nueva === "1")) {
    const planes = await planesPublicos();
    // La prueba gratis es una vez por comercio (el servidor lo vuelve a verificar al suscribir).
    const { count: pagasAntes } = await crearClienteAdmin()
      .from("suscripciones")
      .select("id", { count: "exact", head: true })
      .eq("comercio_id", comercio.id)
      .not("mp_preapproval_id", "is", null);
    const elegido = (typeof sp.plan === "string" ? sp.plan : null) ?? (await planElegidoAlRegistrarse()) ?? planes[planes.length - 1]?.codigo;
    const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? "";
    return (
      <Marco>
        <Encabezado sobre={comercio.nombre} titulo="Activá tu cuenta" detalle="Elegí el plan y cargá la tarjeta para el débito automático." />
        {env.mpConfigurado ? (
          <Suscribirse
            comercioId={comercio.id}
            email={email}
            publicKey={publicKey}
            hoy={new Date().toISOString()}
            planInicial={elegido}
            planes={planes.map((p) => ({
              codigo: p.codigo,
              nombre: p.nombre,
              precioCentavos: p.precioCentavos,
              diasPrueba: (pagasAntes ?? 0) > 0 ? 0 : p.diasPrueba,
              beneficios: beneficiosPlan(p.limites),
            }))}
          />
        ) : (
          <Vacio titulo="Los pagos todavía no están configurados" ilustracion={false}>
            Falta cargar las credenciales de Mercado Pago. Probá de nuevo en un rato.
          </Vacio>
        )}
      </Marco>
    );
  }

  const d = describir(suscripcion);
  const admin = crearClienteAdmin();
  const puedeCambiar = !!suscripcion.mpPreapprovalId && (suscripcion.estado === "trialing" || suscripcion.estado === "authorized");
  const [{ data: avisos }, { data: cuotas }, todosLosPlanes] = await Promise.all([
    admin.from("avisos_comercio").select("id, titulo, texto, created_at").eq("comercio_id", comercio.id).order("created_at", { ascending: false }).limit(5),
    admin
      .from("pagos_suscripcion")
      .select("id, monto_centavos, estado, estado_pago, fecha_debito, fecha_pago")
      .eq("suscripcion_id", suscripcion.id)
      .order("fecha_debito", { ascending: false })
      .limit(6),
    puedeCambiar ? planesPublicos() : Promise.resolve([]),
  ]);
  const planActual = todosLosPlanes.find((p) => p.codigo === suscripcion.planCodigo);
  return (
    <Marco>
      <Encabezado sobre={comercio.nombre} titulo="Facturación" />
      <Superficie className="p-5">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${d.tono === "ok" ? "bg-pt-accent-soft text-pt-accent-ink" : "bg-amber-50 text-amber-800"}`}
            aria-hidden
          >
            <Icono nombre={d.tono === "ok" ? "check" : "historial"} tamaño={20} />
          </span>
          <div className="min-w-0">
            <p className="text-[17px] font-semibold text-pt-ink">{d.titulo}</p>
            {d.detalle && <p className="mt-1 pt-app-detalle text-pt-ink-2">{d.detalle}</p>}
            {suscripcion.mpPayerEmail && <p className="mt-2 pt-app-detalle text-pt-ink-3">Titular de la tarjeta: {suscripcion.mpPayerEmail}</p>}
          </div>
        </div>
      </Superficie>
      {suscripcion.mpPreapprovalId && (
        <div className="mt-4">
          <Gestionar
            comercioId={comercio.id}
            estado={suscripcion.estado}
            publicKey={process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? ""}
            precioCentavos={suscripcion.precioCentavos ?? 0}
            payerEmail={suscripcion.mpPayerEmail}
            finPeriodo={fecha(suscripcion.currentPeriodEnd)}
          />
        </div>
      )}
      {puedeCambiar && planActual && todosLosPlanes.length > 1 && (
        <div id="plan">
          <Seccion titulo="Cambiar de plan">
            <CambiarPlan
              comercioId={comercio.id}
              actual={{
                codigo: planActual.codigo,
                nombre: planActual.nombre,
                precioCentavos: planActual.precioCentavos,
                tienePromos: planActual.limites.promos,
              }}
              planes={todosLosPlanes.map((p) => ({
                codigo: p.codigo,
                nombre: p.nombre,
                precioCentavos: p.precioCentavos,
                beneficios: beneficiosPlan(p.limites),
                tienePromos: p.limites.promos,
              }))}
              enPrueba={suscripcion.estado === "trialing"}
              finPeriodo={fecha(suscripcion.currentPeriodEnd)}
              programado={suscripcion.planProgramado}
            />
          </Seccion>
        </div>
      )}
      {suscripcion.estado === "cancelled" && (
        <div className="mt-4">
          <BotonLink href="/panel/facturacion?nueva=1">Volver a activar</BotonLink>
        </div>
      )}
      {cuotas && cuotas.length > 0 && (
        <Seccion titulo="Tus cobros">
          <Superficie as="ul" className="divide-y divide-pt-border/60">
            {cuotas.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[15px] text-pt-ink">
                <span>{fecha(c.fecha_pago ?? c.fecha_debito)}</span>
                <span className="flex items-center gap-3">
                  <span className="tabular-nums">{formatearPesos(c.monto_centavos)}</span>
                  <span className={`text-[13px] font-semibold ${estadoCuota(c).tono}`}>{estadoCuota(c).texto}</span>
                </span>
              </li>
            ))}
          </Superficie>
        </Seccion>
      )}
      {avisos && avisos.length > 0 && (
        <Seccion titulo="Novedades">
          <Superficie as="ul" className="divide-y divide-pt-border/60">
            {avisos.map((a) => (
              <li key={a.id} className="px-5 py-3">
                <p className="text-[15px] font-semibold text-pt-ink">{a.titulo}</p>
                <p className="pt-app-detalle text-pt-ink-2">{a.texto}</p>
                <p className="mt-1 text-[12px] text-pt-ink-3">{fecha(a.created_at)}</p>
              </li>
            ))}
          </Superficie>
        </Seccion>
      )}
      <Seccion titulo="Chips NFC">
        <Superficie className="flex items-center gap-4 p-5">
          <Icono nombre="nfc" tamaño={24} className="shrink-0 text-pt-ink" />
          <p className="flex-1 pt-app-detalle text-pt-ink-2">Kit de 10 llaveros o chips sueltos, con envío o retiro.</p>
          <BotonLink href="/panel/kit" variante="secundario" tamaño="sm">
            Comprar
          </BotonLink>
        </Superficie>
      </Seccion>
      <Seccion titulo="Tu plan incluye">
        <Superficie as="ul" className="divide-y divide-pt-border/60">
          {beneficiosPlan(suscripcion.limites).map((b) => (
            <li key={b} className="flex items-center gap-3 px-5 py-3 text-[15px] text-pt-ink">
              <Icono nombre="check" tamaño={16} className="text-pt-accent-ink" />
              {b}
            </li>
          ))}
        </Superficie>
      </Seccion>
      {local && (
        <div className="mt-8">
          <BotonLink href={`/panel/${local.slug}`}>Ir a mi panel</BotonLink>
        </div>
      )}
    </Marco>
  );
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-app flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-lg flex-1 px-5 py-10">
        <div className="flex items-center justify-between gap-3">
          <Link href="/panel" aria-label="Volver al panel">
            <LogoPoint alto={24} />
          </Link>
          {/* Sin suscripción, /panel vuelve acá: la única salida es cerrar sesión. */}
          <form action={salir}>
            <button className={claseBoton("fantasma", "sm")}>
              <Icono nombre="salir" tamaño={16} /> Salir
            </button>
          </form>
        </div>
        <div className="mt-8">{children}</div>
      </main>
      <Toasts />
      <Dialogos />
    </div>
  );
}
