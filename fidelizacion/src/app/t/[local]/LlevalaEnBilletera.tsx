"use client";

import { useState } from "react";

/** QR + link personal para guardar la tarjeta en una app de billetera (p. ej. Pass2U). */
export function LlevalaEnBilletera({ url, qrSvg }: { url: string; qrSvg: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <details className="group mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200/70">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-4 font-medium">
        <span>📲 Llevala en tu billetera</span>
        <span className="text-stone-400 transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="space-y-4 px-4 pb-5">
        <p className="text-sm text-stone-600">
          Este es el código de <strong>tu</strong> tarjeta. Guardalo en una app de billetera (como Pass2U) y abrila desde ahí cuando quieras.
        </p>
        <div
          className="mx-auto w-48 rounded-xl bg-white p-2 ring-1 ring-stone-200 [&>svg]:h-full [&>svg]:w-full"
          aria-label="Código QR de tu tarjeta"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <div className="grid grid-cols-2 gap-2">
          <a
            href={`${url}/qr`}
            download="mi-tarjeta.png"
            className="rounded-xl px-3 py-2.5 text-center text-sm font-semibold"
            style={{ background: "var(--marca)", color: "var(--marca-texto)" }}
          >
            Guardar imagen
          </a>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopiado(true);
              } catch {}
            }}
            className="rounded-xl border border-stone-300 px-3 py-2.5 text-sm font-semibold text-stone-700"
          >
            {copiado ? "Copiado ✓" : "Copiar link"}
          </button>
        </div>
        <ol className="list-decimal space-y-1 pl-5 text-xs text-stone-500">
          <li>En Pass2U tocá <strong>+</strong>.</li>
          <li>
            Elegí <strong>“Obtenga el código de barras de una imagen”</strong> (con la imagen guardada) o{" "}
            <strong>“Ingrese el mensaje”</strong> y pegá el link.
          </li>
          <li>Ponele el nombre del local y listo. No lo compartas: es tu tarjeta.</li>
        </ol>
      </div>
    </details>
  );
}
