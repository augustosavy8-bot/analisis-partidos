import Link from "next/link";
import type { Local } from "@/lib/locales";
import { cuandoFuturo, type Movimiento, type Premio } from "@/lib/tarjeta";
import { describirPromo, horaCorta, nombreMultiplicador, type Promo } from "@/lib/promos";
import { formasTermino } from "@/lib/terminos";
import { Icono } from "@/components/Icono";
import { LogoPoint } from "@/components/MarcaPoint";
import { OndasNfc } from "@/components/Animaciones";
import { PointCard } from "@/components/landing/PointCard";
import { PointCard3D } from "@/components/landing/PointCard3D";
import { MotionProvider } from "@/components/landing/MotionProvider";
import { Aviso, Encabezado, Seccion, Lista } from "@/components/app/Superficie";
import { BotonLink } from "@/components/app/Boton";
import { EstadoVacio } from "@/components/app/EstadoVacio";
import { Toasts } from "@/components/app/Toasts";
import { Pestanas } from "./Pestanas";
import { Celebracion } from "./Celebracion";
import { InstalarTarjeta } from "./InstalarTarjeta";
import { LlevalaEnBilletera } from "./LlevalaEnBilletera";
import { FormCumple } from "./FormCumple";
import { ListaPremios } from "./ListaPremios";
import { Historial } from "./Historial";

export type DatosCelebracion = {
  tipo: "suma" | "canje";
  sumados: number;
  promo: string | null;
  premio: string | null;
  completo: { meta: number; premio: string } | null;
  regalos: { motivo: "bienvenida" | "cumple"; puntos: number }[];
  mensaje: string;
};

type Props = {
  local: Local;
  nombre: string;
  tarjeta: {
    puntos: number;
    serial: string;
    created_at: string;
    movimientos: Movimiento[];
  };
  premios: Premio[];
  promos: Promo[];
  promoAhora: Promo | null;
  objetivo: Premio | null;
  /** Hubo un toque hace instantes: se puede canjear sin otro toque. */
  alToque: boolean;
  pedirCumple: boolean;
  limite: string | null;
  /** El local no está sumando (dejó de pagar Point): se avisa sin hablar de facturación. */
  pausado?: boolean;
  urlPase: string;
  qrPase: string;
  /** Link "Agregar a Google Wallet" (sólo Android con Google Wallet configurado). */
  googleWallet?: string;
  /** Link "Agregar a Apple Wallet" (.pkpass; iPhone o compu con Apple Wallet configurado). */
  appleWallet?: string;
  celebracion: DatosCelebracion | null;
};

/** La tarjeta del cliente (sólo presentación: los datos los busca la página). */
export function VistaTarjeta(p: Props) {
  const { local, tarjeta } = p;
  const primerNombre = p.nombre.split(" ")[0];
  const termino = formasTermino(local.termino_personal).singular;
  const alcanzaAlguno = p.premios.some((pr) => tarjeta.puntos >= pr.puntos_necesarios);

  const tarjetaPoint = (
    <PointCard3D
      modo="app"
      comercio={local.nombre}
      inicial={local.nombre.charAt(0).toUpperCase()}
      logo={local.logo_url}
      puntos={tarjeta.puntos}
      meta={p.objetivo?.puntos_necesarios ?? null}
      premio={p.objetivo?.nombre.toLowerCase()}
    />
  );

  const pestanaTarjeta = (
    <>
      <Encabezado
        sobre="Hola,"
        titulo={primerNombre}
        accion={
          <Link
            href="/inicio"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-pt-ink px-3.5 text-[13px] font-semibold text-pt-pure transition-transform duration-150 active:scale-95"
          >
            <Icono nombre="tarjeta" tamaño={16} />
            Mis tarjetas
          </Link>
        }
      />

      {p.promoAhora && (
        <Aviso tono="acento" icono="sumar-punto" className="mb-4">
          <strong className="font-semibold">Ahora {nombreMultiplicador(p.promoAhora.puntos)}</strong> · {p.promoAhora.nombre}, hasta las{" "}
          {horaCorta(p.promoAhora.hasta)}
        </Aviso>
      )}

      {tarjetaPoint}
      <p className="mt-3 flex justify-between px-1 pt-app-detalle text-pt-ink-2">
        <span className="truncate">{p.nombre}</span>
        <span className="shrink-0 tabular-nums">Desde {formatearMesAnio(tarjeta.created_at, local.zona_horaria)}</span>
      </p>

      {alcanzaAlguno && (
        <a
          href="#premios"
          className="pt-subir mt-5 flex items-center gap-3 rounded-pt-card bg-pt-accent-soft px-4 py-3.5 text-pt-ink transition-colors duration-150 hover:bg-pt-accent/25"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pt-accent text-pt-ink" aria-hidden>
            <Icono nombre="premio" tamaño={18} />
          </span>
          <span className="min-w-0 flex-1 pt-app-detalle">
            <strong className="block text-[15px] font-semibold">Tenés un premio para canjear</strong>
            <span className="text-pt-accent-ink">Ver premios</span>
          </span>
          <Icono nombre="chevron" tamaño={18} className="text-pt-accent-ink" />
        </a>
      )}

      {p.pedirCumple && <FormCumple slug={local.slug} puntos={local.puntos_cumple} />}

      {p.promos.length > 0 && (
        <Seccion titulo="Promos" className="!mt-7">
          <Lista>
            {p.promos.map((promo) => (
              <li key={promo.id} className="flex items-center gap-3.5 px-4 py-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pt-sm bg-pt-ink font-[family-name:var(--font-pt-display)] text-sm font-bold text-pt-accent">
                  x{promo.puntos}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-pt-ink">{promo.nombre}</p>
                  <p className="pt-app-detalle text-pt-ink-2">{describirPromo(promo)}</p>
                </div>
              </li>
            ))}
          </Lista>
        </Seccion>
      )}

      <LlevalaEnBilletera
        url={p.urlPase}
        qrSvg={p.qrPase}
        googleWallet={p.googleWallet}
        appleWallet={p.appleWallet}
        franja={`/t/${local.slug}/franja?p=${tarjeta.puntos}${p.objetivo ? `&m=${p.objetivo.puntos_necesarios}` : ""}`}
      />

      <footer className="mt-10 flex flex-col items-center gap-1.5 pt-app-detalle text-pt-ink-2">
        <span className="inline-flex items-center gap-1.5 opacity-70 grayscale">
          con <LogoPoint alto={14} />
        </span>
        <Link href="/privacidad" className="underline underline-offset-2 hover:text-pt-ink">
          Privacidad
        </Link>
      </footer>
    </>
  );

  const pestanaPremios = (
    <>
      <Encabezado titulo="Premios" detalle={`Tenés ${tarjeta.puntos} ${tarjeta.puntos === 1 ? "punto" : "puntos"}`} />
      {p.premios.length > 0 ? (
        <ListaPremios
          slug={local.slug}
          premios={p.premios}
          puntos={tarjeta.puntos}
          alToque={p.alToque}
          termino={termino}
        />
      ) : (
        <EstadoVacio
          comercio={local.nombre}
          titulo="Todavía no hay premios"
          texto={`${local.nombre} está armando sus premios. Igual sumás en cada visita: cuando estén, los vas a ver acá.`}
          accion={
            <BotonLink href="#tarjeta" variante="secundario">
              Ver mi tarjeta
            </BotonLink>
          }
        />
      )}
    </>
  );

  const pestanaHistorial = (
    <>
      <Encabezado titulo="Historial" detalle="Tus puntos y canjes en este local" />
      <Historial movimientos={tarjeta.movimientos} zona={local.zona_horaria} comercio={local.nombre} termino={termino} />
    </>
  );

  return (
    <div className="pt-app flex flex-1 flex-col">
      <MotionProvider>
        <main className="mx-auto w-full max-w-md flex-1 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[calc(var(--spacing-pt-tabbar)+env(safe-area-inset-bottom)+2rem)]">
          {p.celebracion && <Celebracion {...p.celebracion} puntos={tarjeta.puntos} comercio={local.nombre} logo={local.logo_url} />}

          {/* Avisos que importan en cualquier pestaña */}
          {p.pausado && (
            <Aviso icono="historial" className="mb-4">
              {local.nombre} pausó su programa de puntos: por ahora no se suman puntos acá. Los que ya tenés siguen siendo tuyos
              y los podés canjear.
            </Aviso>
          )}
          {p.limite && (
            <Aviso icono="historial" className="mb-4">
              Ya sumaste hace poco. Vas a poder sumar de nuevo <strong>{cuandoFuturo(p.limite, local.zona_horaria)}</strong>.
            </Aviso>
          )}

          <Pestanas
            pestanas={[
              { clave: "tarjeta", nombre: "Tarjeta", icono: "tarjeta", contenido: pestanaTarjeta },
              { clave: "premios", nombre: "Premios", icono: "premio", contenido: pestanaPremios, marca: alcanzaAlguno },
              { clave: "historial", nombre: "Historial", icono: "historial", contenido: pestanaHistorial },
            ]}
          />
          <InstalarTarjeta />
        </main>
        <Toasts />
      </MotionProvider>
    </div>
  );
}

function formatearMesAnio(iso: string, zona: string) {
  return new Intl.DateTimeFormat("es-AR", { month: "2-digit", year: "2-digit", timeZone: zona }).format(new Date(iso));
}

/** Sin tarjeta en este celular: la tarjeta en cero + cómo sumar + recuperar. */
export function SinTarjeta({ local }: { local: Local }) {
  const termino = formasTermino(local.termino_personal).singular;
  return (
    <div className="pt-app flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12">
        <div className="mx-auto w-full max-w-[340px] -rotate-3 rounded-pt-lg shadow-pt-card-app">
          <PointCard
            comercio={local.nombre}
            inicial={local.nombre.charAt(0).toUpperCase()}
            logo={local.logo_url}
            puntos={0}
            meta={null}
            leyenda="Tu primer punto te espera"
            reflejo={false}
          />
        </div>
        <h1 className="pt-app-titulo mt-10 text-center text-pt-ink">Todavía no tenés tarjeta en este celular</h1>
        <p className="mt-2 text-center pt-app-texto text-pt-ink-2">
          Pedile al {termino} que apoye su llavero en tu teléfono y sumás tu primer punto.
        </p>
        <div className="mt-6 flex items-center gap-3 rounded-pt-card bg-pt-pure px-4 py-3.5 text-left pt-app-detalle text-pt-ink-2 shadow-pt-ui ring-1 ring-pt-border/60">
          <span className="shrink-0">
            <OndasNfc punto="var(--color-pt-accent)" ondas="var(--color-pt-ink)" tamaño={40} />
          </span>
          <p>En iPhone, cuando aparezca el aviso arriba de la pantalla, tocalo para abrir tu tarjeta.</p>
        </div>
        <BotonLink href={`/recuperar?l=${local.slug}`} variante="primario" tamaño="lg" className="mt-6">
          Ya tengo tarjeta: recuperarla
        </BotonLink>
        <p className="mt-2 text-center pt-app-detalle text-pt-ink-2">Con el WhatsApp que usaste al crearla.</p>
      </main>
    </div>
  );
}
