import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buscarLocal, estiloMarca, type Local } from "@/lib/locales";
import { clienteActual } from "@/lib/sesion-cliente";
import {
  esReciente,
  formatearFecha,
  formatearHora,
  premiosDelLocal,
  proximoPremio,
  tarjetaDelCliente,
} from "@/lib/tarjeta";
import { LogoLocal } from "@/components/CabeceraLocal";
import { Celebracion } from "./Celebracion";
import { CanjePendiente } from "./CanjePendiente";
import { BotonCanjear } from "./BotonCanjear";
import { InstalarTarjeta } from "./InstalarTarjeta";
import { TarjetaVisual } from "@/components/TarjetaVisual";
import { LlevalaEnBilletera } from "./LlevalaEnBilletera";
import QRCode from "qrcode";
import { urlBilletera } from "@/lib/billetera";

export async function generateMetadata({ params }: PageProps<"/t/[local]">): Promise<Metadata> {
  const { local: slug } = await params;
  const local = await buscarLocal(slug);
  if (!local) return {};
  return {
    title: `Mi tarjeta · ${local.nombre}`,
    manifest: `/t/${slug}/manifest.webmanifest`,
    icons: { icon: `/t/${slug}/icono?s=192`, apple: `/t/${slug}/icono?s=180` },
    appleWebApp: { capable: true, title: local.nombre, statusBarStyle: "default" },
  };
}

export default async function Tarjeta({ params, searchParams }: PageProps<"/t/[local]">) {
  const { local: slug } = await params;
  const sp = await searchParams;
  const local = await buscarLocal(slug);
  if (!local) notFound();

  const [cliente, premios] = await Promise.all([clienteActual(), premiosDelLocal(local.id)]);
  const tarjeta = cliente ? await tarjetaDelCliente(cliente.clienteId, local.id) : null;

  if (!cliente || !tarjeta) return <SinTarjeta local={local} />;

  // Celebración: sólo si el movimiento es de esta tarjeta y reciente (no se puede falsear).
  const movId = typeof sp.m === "string" ? sp.m : null;
  const movCelebrado = movId
    ? tarjeta.movimientos.find((m) => m.id === movId && esReciente(m.created_at))
    : undefined;
  const limite = typeof sp.limite === "string" && !isNaN(Date.parse(sp.limite)) ? sp.limite : null;

  const objetivo = proximoPremio(premios, tarjeta.puntos);
  const urlPase = urlBilletera(tarjeta.serial, tarjeta.wallet_auth_token);
  const qrPase = await QRCode.toString(urlPase, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  const primerNombre = cliente.nombre.split(" ")[0];

  let mensajeCelebracion = "";
  if (movCelebrado?.tipo === "suma" && objetivo) {
    const faltan = objetivo.puntos_necesarios - tarjeta.puntos;
    mensajeCelebracion =
      faltan > 0
        ? `Te ${faltan === 1 ? "falta 1 punto" : `faltan ${faltan} puntos`} para ${objetivo.nombre.toLowerCase()}.`
        : `¡Ya podés canjear ${objetivo.nombre.toLowerCase()}!`;
  } else if (movCelebrado?.tipo === "canje") {
    mensajeCelebracion = "Disfrutalo. ¡Gracias por venir!";
  }

  return (
    <main style={estiloMarca(local)} className="mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-6">
      {movCelebrado && (
        <Celebracion tipo={movCelebrado.tipo} puntos={tarjeta.puntos} mensaje={mensajeCelebracion} />
      )}

      <header className="flex items-center justify-between px-2">
        <p className="text-stone-600">
          Hola, <span className="font-semibold text-stone-900">{primerNombre}</span>
        </p>
      </header>

      {limite && (
        <div className="anim-subir mt-4 rounded-2xl bg-stone-900 px-4 py-3 text-sm text-white">
          Ya sumaste hace poco. Vas a poder sumar de nuevo a las{" "}
          <strong>{formatearHora(limite, local.zona_horaria)}</strong>.
        </div>
      )}

      {tarjeta.canjePendiente && (
        <div className="mt-4">
          <CanjePendiente
            slug={local.slug}
            canjeId={tarjeta.canjePendiente.id}
            premio={tarjeta.canjePendiente.premio.nombre}
            expiraEn={tarjeta.canjePendiente.expira_en}
          />
        </div>
      )}

      <TarjetaVisual local={local} puntos={tarjeta.puntos} objetivo={objetivo} />


      {premios.length > 0 && (
        <section className="mt-8">
          <h2 className="px-2 text-sm font-semibold uppercase tracking-widest text-stone-500">Premios</h2>
          <ul className="mt-3 divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200/70">
            {premios.map((p) => {
              const alcanza = tarjeta.puntos >= p.puntos_necesarios;
              return (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-stone-900">{p.nombre}</p>
                    <p className="text-sm text-stone-500">
                      {p.puntos_necesarios} puntos
                      {!alcanza && ` · te faltan ${p.puntos_necesarios - tarjeta.puntos}`}
                    </p>
                  </div>
                  {alcanza ? (
                    <BotonCanjear slug={local.slug} premioId={p.id} deshabilitado={!!tarjeta.canjePendiente} />
                  ) : (
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(tarjeta.puntos / p.puntos_necesarios) * 100}%`, background: "var(--marca)" }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="px-2 text-sm font-semibold uppercase tracking-widest text-stone-500">Historial</h2>
        {tarjeta.movimientos.length === 0 ? (
          <p className="mt-3 px-2 text-sm text-stone-500">Todavía no hay movimientos.</p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200/70">
            {tarjeta.movimientos.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                  style={
                    m.tipo === "suma"
                      ? { background: "var(--marca-acento)", color: "var(--marca)" }
                      : { background: "var(--marca)", color: "var(--marca-texto)" }
                  }
                >
                  {m.tipo === "suma" ? "+1" : "🎁"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-900">
                    {m.tipo === "suma" ? "Sumaste 1 punto" : `Canjeaste ${-m.puntos} puntos`}
                  </p>
                  <p className="text-xs text-stone-500">
                    {formatearFecha(m.created_at, local.zona_horaria)}
                    {m.mozo && ` · ${m.mozo}`}
                    {m.origen === "qr" && " · QR"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <LlevalaEnBilletera url={urlPase} qrSvg={qrPase} />

      <InstalarTarjeta />
    </main>
  );
}

function SinTarjeta({ local }: { local: Local }) {
  return (
    <main style={estiloMarca(local)} className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16 text-center">
      <div className="mx-auto">
        <LogoLocal local={local} tamaño={64} />
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">{local.nombre}</h1>
      <p className="mt-3 text-stone-600">
        Todavía no tenés tarjeta en este celular. Pedile al mozo que apoye su llavero en tu teléfono y sumás tu primer punto.
      </p>
      <Link
        href={`/recuperar?l=${local.slug}`}
        className="mt-8 rounded-xl border border-stone-300 bg-white px-4 py-3 font-medium text-stone-800 shadow-sm"
      >
        Ya tengo tarjeta: recuperarla
      </Link>
    </main>
  );
}
