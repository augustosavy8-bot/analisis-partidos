import Link from "next/link";
import { estiloMarca, type Local } from "@/lib/locales";
import { formatearHora, type CanjePendiente as TipoCanje, type Movimiento, type Premio } from "@/lib/tarjeta";
import { describirPromo, horaCorta, nombreMultiplicador, type Promo } from "@/lib/promos";
import { formasTermino } from "@/lib/terminos";
import { LogoLocal } from "@/components/CabeceraLocal";
import { TarjetaVisual } from "@/components/TarjetaVisual";
import { LogoPoint } from "@/components/MarcaPoint";
import { OndasNfc } from "@/components/Animaciones";
import { Celebracion } from "./Celebracion";
import { CanjePendiente } from "./CanjePendiente";
import { InstalarTarjeta } from "./InstalarTarjeta";
import { LlevalaEnBilletera } from "./LlevalaEnBilletera";
import { FormCumple } from "./FormCumple";
import { ListaPremios } from "./ListaPremios";
import { Historial } from "./Historial";
import { Icono, type NombreIcono } from "@/components/Icono";

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
    canjePendiente: TipoCanje | null;
  };
  premios: Premio[];
  promos: Promo[];
  promoAhora: Promo | null;
  objetivo: Premio | null;
  /** Hubo un toque hace instantes: se puede canjear sin otro toque. */
  alToque: boolean;
  pedirCumple: boolean;
  limite: string | null;
  urlPase: string;
  qrPase: string;
  celebracion: DatosCelebracion | null;
};

/** La tarjeta del cliente (sólo presentación: los datos los busca la página). */
export function VistaTarjeta(p: Props) {
  const { local, tarjeta } = p;
  const primerNombre = p.nombre.split(" ")[0];
  const termino = formasTermino(local.termino_personal).singular;

  return (
    <div style={estiloMarca(local)} className="fondo-marca flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
        {p.celebracion && <Celebracion {...p.celebracion} animacion={local.animacion_canje} puntos={tarjeta.puntos} />}

        <header className="flex items-center justify-between px-1 pt-1">
          <div>
            <p className="text-[13px] font-medium text-stone-500">Hola,</p>
            <p className="text-2xl font-semibold tracking-tight text-stone-900">{primerNombre}</p>
          </div>
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full text-base font-semibold shadow-sm ring-4 ring-white/70"
            style={{ background: "var(--marca)", color: "var(--marca-texto)" }}
            aria-hidden
          >
            {primerNombre.charAt(0).toUpperCase()}
          </div>
        </header>

        {p.limite && (
          <Aviso icono="historial">
            Ya sumaste hace poco. Vas a poder sumar de nuevo a las <strong>{formatearHora(p.limite, local.zona_horaria)}</strong>.
          </Aviso>
        )}

        {tarjeta.canjePendiente && (
          <div className="mt-5">
            <CanjePendiente
              slug={local.slug}
              canjeId={tarjeta.canjePendiente.id}
              premio={tarjeta.canjePendiente.premio.nombre}
              expiraEn={tarjeta.canjePendiente.expira_en}
              termino={termino}
            />
          </div>
        )}

        {p.promoAhora && (
          <div
            className="anim-subir mt-5 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm"
            style={{ background: "var(--marca-acento)", color: "var(--marca)" }}
          >
            <span className="text-lg" aria-hidden>🔥</span>
            <p>
              <strong className="font-semibold">Ahora {nombreMultiplicador(p.promoAhora.puntos)}</strong> · {p.promoAhora.nombre}, hasta las{" "}
              {horaCorta(p.promoAhora.hasta)}
            </p>
          </div>
        )}

        <TarjetaVisual
          local={local}
          puntos={tarjeta.puntos}
          objetivo={p.objetivo}
          titular={p.nombre}
          desde={tarjeta.created_at}
          serial={tarjeta.serial}
        />

        {p.pedirCumple && <FormCumple slug={local.slug} puntos={local.puntos_cumple} />}

        {p.premios.length > 0 && (
          <ListaPremios
            slug={local.slug}
            premios={p.premios}
            puntos={tarjeta.puntos}
            hayCanjePendiente={!!tarjeta.canjePendiente}
            alToque={p.alToque}
            termino={termino}
          />
        )}

        {p.promos.length > 0 && (
          <section className="mt-8">
            <h2 className="titulo-seccion">Promos</h2>
            <ul className="mt-3 space-y-2.5">
              {p.promos.map((promo) => (
                <li key={promo.id} className="superficie flex items-center gap-3.5 px-4 py-3.5">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold"
                    style={{ background: "var(--marca)", color: "var(--marca-acento)" }}
                  >
                    x{promo.puntos}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold tracking-tight text-stone-900">{promo.nombre}</p>
                    <p className="text-[13px] text-stone-500">{describirPromo(promo)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Historial movimientos={tarjeta.movimientos} zona={local.zona_horaria} />

        <LlevalaEnBilletera
          url={p.urlPase}
          qrSvg={p.qrPase}
          franja={`/t/${local.slug}/franja?p=${tarjeta.puntos}${p.objetivo ? `&m=${p.objetivo.puntos_necesarios}` : ""}`}
        />

        <div className="mt-10 flex flex-col items-center gap-1.5 text-xs text-stone-400">
          <span className="inline-flex items-center gap-1.5 opacity-70 grayscale">
            con <LogoPoint alto={14} />
          </span>
          <Link href="/privacidad" className="underline underline-offset-2">Privacidad</Link>
        </div>

        <InstalarTarjeta />
      </main>
    </div>
  );
}

function Aviso({ icono, children }: { icono: NombreIcono; children: React.ReactNode }) {
  return (
    <div className="anim-subir mt-5 flex items-center gap-3 rounded-2xl bg-stone-900 px-4 py-3 text-sm text-white shadow-lg">
      <Icono nombre={icono} tamaño={20} className="shrink-0" />
      <p>{children}</p>
    </div>
  );
}

export function SinTarjeta({ local }: { local: Local }) {
  const termino = formasTermino(local.termino_personal).singular;
  return (
    <div style={estiloMarca(local)} className="fondo-marca flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16 text-center">
        <div className="anim-pop mx-auto rounded-3xl p-1 shadow-xl ring-1 ring-black/5">
          <LogoLocal local={local} tamaño={72} />
        </div>
        <h1 className="anim-subir mt-6 text-3xl font-semibold tracking-tight text-stone-900">{local.nombre}</h1>
        <p className="anim-subir mt-3 text-stone-600" style={{ animationDelay: "80ms" }}>
          Todavía no tenés tarjeta en este celular. Pedile al {termino} que apoye su llavero en tu teléfono y sumás tu primer punto.
        </p>
        <div className="anim-subir superficie mx-auto mt-8 flex items-center gap-3 px-5 py-4 text-left text-sm text-stone-700" style={{ animationDelay: "160ms" }}>
          <span className="shrink-0">
            <OndasNfc punto="var(--marca-acento)" ondas="var(--marca)" tamaño={44} />
          </span>
          <p>En iPhone, cuando aparezca el aviso arriba de la pantalla, tocalo para abrir tu tarjeta.</p>
        </div>
        <Link
          href={`/recuperar?l=${local.slug}`}
          className="mt-6 font-medium text-stone-700 underline decoration-stone-300 underline-offset-4"
        >
          Ya tengo tarjeta: recuperarla con mi WhatsApp
        </Link>
      </main>
    </div>
  );
}
