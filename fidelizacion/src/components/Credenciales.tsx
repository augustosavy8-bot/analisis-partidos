"use client";

import { useState } from "react";

/** Muestra usuario y contraseña temporal para pasarle al dueño (se ve una sola vez). */
export function Credenciales({ email, password, url }: { email: string; password: string; url: string }) {
  const [copiado, setCopiado] = useState(false);
  const texto = `Tu panel de fidelización: ${url}\nUsuario: ${email}\nContraseña: ${password}`;
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
      <p className="font-semibold text-amber-900">Pasale estos datos al dueño (no se vuelven a mostrar):</p>
      <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-3 font-mono text-xs text-stone-800 ring-1 ring-amber-200">{texto}</pre>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(texto);
              setCopiado(true);
            } catch {}
          }}
          className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white"
        >
          {copiado ? "Copiado ✓" : "Copiar"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
          target="_blank"
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700"
        >
          Enviar por WhatsApp
        </a>
      </div>
    </div>
  );
}
