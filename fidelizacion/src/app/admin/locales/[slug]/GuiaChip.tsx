"use client";

import { useState } from "react";

/** Instrucciones para programar un NTAG 424 DNA con SUN (sólo superadmin). */
export function GuiaChip({ appUrl, metaKey }: { appUrl: string; metaKey: string | null }) {
  const [ver, setVer] = useState(false);
  const plantilla = `${appUrl}/n?p=00000000000000000000000000000000&m=0000000000000000`;
  return (
    <details className="rounded-2xl bg-white p-5 text-sm shadow-sm ring-1 ring-stone-200/70">
      <summary className="cursor-pointer font-medium">Cómo programar un NTAG 424 DNA</summary>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-stone-700">
        <li>
          Con <strong>NXP TagXplorer</strong> (PC + lector) o <strong>NFC TagWriter by NXP</strong> (Android), grabá un registro URL con esta plantilla:
          <p className="mt-1 break-all rounded-lg bg-stone-50 p-2 font-mono text-xs">{plantilla}</p>
        </li>
        <li>
          Activá <strong>SDM/SUN</strong> sobre el archivo NDEF con: UID y contador de lecturas <em>reflejados y cifrados</em> en PICCData
          (offset = primer 0 después de <code>p=</code>) y <strong>SDMMAC</strong> (offset = primer 0 después de <code>m=</code>), con
          el input del MAC en el mismo offset que el MAC.
        </li>
        <li>
          Claves: <strong>SDMMetaRead</strong> = clave de metadatos común (abajo) · <strong>SDMFileRead</strong> = una clave única por chip,
          que es la que cargás en “Alta de chip” (modo producción). Cambiá también la clave maestra (key 0) del chip.
        </li>
        <li>
          Cargá el chip acá con su <strong>UID</strong> (7 bytes) y su clave SDMFileRead, y probalo con “Simular toque” o apoyándolo en un celular.
        </li>
      </ol>
      <div className="mt-4 rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200">
        <p className="font-medium text-amber-900">Clave de metadatos (SDMMetaRead, común a todos los chips)</p>
        {metaKey ? (
          ver ? (
            <p className="mt-1 break-all font-mono text-xs">{metaKey}</p>
          ) : (
            <button type="button" onClick={() => setVer(true)} className="mt-1 text-xs font-semibold underline">
              Mostrar
            </button>
          )
        ) : (
          <p className="mt-1 text-xs text-amber-900">Falta configurar NFC_SDM_META_KEY en el servidor.</p>
        )}
      </div>
    </details>
  );
}
