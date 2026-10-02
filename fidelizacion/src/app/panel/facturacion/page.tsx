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

export const metadata = { title: "Facturación", robots: { index: false } };

const fecha = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(iso)) : null;

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
      return { titulo: `Plan ${s.planNombre} · pausado`, detalle: "No se te cobra mientras esté pausado.", tono: "aviso" };
    case "past_due":
      return { titulo: `Plan ${s.planNombre} · pago pendiente`, detalle: "No pudimos cobrar la última cuota. Mercado Pago lo reintenta.", tono: "aviso" };
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

  if (!suscripcion) {
    const planes = await planesPublicos();
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
              diasPrueba: p.diasPrueba,
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
    </div>
  );
}
