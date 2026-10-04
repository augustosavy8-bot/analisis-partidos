"use client";

import { useState } from "react";
import { Icono } from "@/components/Icono";
import { claseBoton } from "@/components/app/Boton";
import { avisar } from "@/components/app/Toasts";

/**
 * "Llevala en tu billetera".
 *  - Con billeteras nativas configuradas: badges oficiales (Apple en iPhone, Google en
 *    Android, los dos en la compu). El pase se actualiza solo con cada punto y Pass2U
 *    queda como alternativa plegada.
 *  - Sin billeteras nativas: QR + link personal para Pass2U.
 */
export function LlevalaEnBilletera({
  url,
  qrSvg,
  franja,
  googleWallet,
  appleWallet,
}: {
  url: string;
  qrSvg: string;
  franja: string;
  googleWallet?: string;
  appleWallet?: string;
}) {
  if (googleWallet || appleWallet) {
    return (
      <section className="mt-7 rounded-pt-card bg-pt-pure p-4 shadow-pt-ui ring-1 ring-pt-border/60">
        <p className="flex items-center gap-3 text-[15px] font-semibold text-pt-ink">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pt-surface" aria-hidden>
            <Icono nombre="wallet" tamaño={18} />
          </span>
          Llevala en tu billetera
        </p>
        <p className="mt-2 pt-app-detalle text-pt-ink-2">Guardala en la billetera de tu celular: se actualiza sola cada vez que sumás.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {/* Badges oficiales, sin modificar (guidelines de Apple y de Google). */}
          {appleWallet && (
            <a href={appleWallet} className="inline-block rounded-[10px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pt-accent-dark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/wallet/agregar-a-apple-wallet.svg" alt="Agregar a Apple Wallet" height={48} className="h-12 w-auto" />
            </a>
          )}
          {googleWallet && (
            <a href={googleWallet} className="inline-block rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pt-accent-dark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/wallet/agregar-a-google-wallet.svg" alt="Agregar a la Billetera de Google" height={48} className="h-12 w-auto" />
            </a>
          )}
        </div>
        <details className="group mt-4 border-t border-pt-border pt-3">
          <summary className="flex cursor-pointer list-none items-center justify-between pt-app-detalle font-medium text-pt-ink-2 hover:text-pt-ink [&::-webkit-details-marker]:hidden">
            Usar otra app de billetera
            <Icono nombre="chevron" tamaño={16} className="rotate-90 transition-transform duration-200 group-open:-rotate-90" />
          </summary>
          <div className="pt-4">
            <ContenidoPass2U url={url} qrSvg={qrSvg} franja={franja} />
          </div>
        </details>
      </section>
    );
  }
  return (
    <details className="group mt-7 overflow-hidden rounded-pt-card bg-pt-pure shadow-pt-ui ring-1 ring-pt-border/60">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 transition-colors duration-150 hover:bg-pt-surface/60 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-3 text-[15px] font-semibold text-pt-ink">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pt-surface" aria-hidden>
            <Icono nombre="wallet" tamaño={18} />
          </span>
          Llevala en tu billetera
        </span>
        <Icono nombre="chevron" tamaño={18} className="rotate-90 text-pt-ink-2 transition-transform duration-200 group-open:-rotate-90" />
      </summary>
      <div className="border-t border-pt-border px-4 pb-5 pt-4">
        <ContenidoPass2U url={url} qrSvg={qrSvg} franja={franja} />
      </div>
    </details>
  );
}

/** QR + link personal para guardar la tarjeta en una app de billetera (p. ej. Pass2U). */
function ContenidoPass2U({ url, qrSvg, franja }: { url: string; qrSvg: string; franja: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="space-y-4">
      <p className="pt-app-detalle text-pt-ink-2">
        Este es el código de <strong className="text-pt-ink">tu</strong> tarjeta. Guardalo en una app de billetera (como Pass2U) y abrila desde ahí cuando quieras.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={franja} alt="Tu tarjeta con tus sellos" className="w-full rounded-pt-sm ring-1 ring-pt-border" loading="lazy" />
      <a href={franja} download="mi-tarjeta-sellos.png" className="block text-center pt-app-detalle font-medium text-pt-ink underline underline-offset-2">
        Guardar la imagen con mis sellos
      </a>
      <div
        className="blanco-fijo mx-auto w-44 rounded-pt-sm bg-white p-2 ring-1 ring-pt-border [&>svg]:h-full [&>svg]:w-full"
        role="img"
        aria-label="Código QR de tu tarjeta"
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />
      <div className="grid grid-cols-2 gap-2">
        <a href={`${url}/qr`} download="mi-tarjeta.png" className={claseBoton("primario", "md", "!rounded-pt-sm !text-[13px]")}>
          <Icono nombre="descargar" tamaño={16} /> Guardar QR
        </a>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopiado(true);
              avisar("Link copiado");
            } catch {}
          }}
          className={claseBoton("secundario", "md", "!rounded-pt-sm !text-[13px]")}
        >
          {copiado ? "Copiado" : "Copiar link"}
        </button>
      </div>
      <ol className="list-decimal space-y-1 pl-5 pt-app-detalle text-pt-ink-2">
        <li>En Pass2U tocá <strong className="text-pt-ink">+</strong>.</li>
        <li>
          Elegí <strong className="text-pt-ink">“Obtenga el código de barras de una imagen”</strong> (con la imagen guardada) o{" "}
          <strong className="text-pt-ink">“Ingrese el mensaje”</strong> y pegá el link.
        </li>
        <li>Ponele el nombre del local y listo. No lo compartas: es tu tarjeta.</li>
      </ol>
    </div>
  );
}
