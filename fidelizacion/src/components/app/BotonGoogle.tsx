"use client";

import { useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/browser";

type Proveedor = "google" | "apple";

/**
 * "Continuar con Google / Apple" (Supabase Auth). Vuelve por /auth/callback, que
 * abre la sesión y sigue a `siguiente` (una ruta propia).
 */
export function BotonGoogle({ siguiente = "/panel", oscuro = false, proveedor = "google" }: { siguiente?: string; oscuro?: boolean; proveedor?: Proveedor }) {
  const [yendo, setYendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continuar() {
    setYendo(true);
    setError(null);
    const { error: e } = await crearClienteNavegador().auth.signInWithOAuth({
      provider: proveedor,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(siguiente)}` },
    });
    if (e) {
      setYendo(false);
      setError(`No pudimos abrir ${proveedor === "apple" ? "Apple" : "Google"}. Probá de nuevo.`);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={continuar}
        disabled={yendo}
        className={`flex h-12 w-full items-center justify-center gap-3 rounded-full text-[15px] font-semibold transition-colors duration-150 disabled:opacity-60 ${
          proveedor === "apple"
            ? oscuro
              ? "bg-white text-black hover:bg-white/90"
              : "bg-pt-ink text-white hover:bg-pt-ink/85"
            : oscuro
              ? "bg-white text-stone-900 hover:bg-white/90"
              : "bg-pt-pure text-pt-ink ring-1 ring-inset ring-pt-border hover:bg-pt-surface"
        }`}
      >
        {proveedor === "apple" ? (
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="currentColor">
            <path d="M16.37 12.2c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.87-.76-1.47.02-2.83.86-3.59 2.18-1.54 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.24 2.73 2.2 1.1-.05 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.41 1.2-2.47-.03-.01-2.29-.88-2.31-3.5zM14.2 5.74c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.65-1.05 1.68-.92 2.68.97.07 1.96-.49 2.56-1.23z" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        )}
        {yendo ? "Abriendo…" : `Continuar con ${proveedor === "apple" ? "Apple" : "Google"}`}
      </button>
      {error && (
        <p className="mt-2 text-center text-[13px] text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Separador "o" entre Google y el formulario de email. */
export function SeparadorO({ oscuro = false }: { oscuro?: boolean }) {
  return (
    <div className={`my-5 flex items-center gap-3 text-[13px] ${oscuro ? "text-white/50" : "text-pt-ink-3"}`} aria-hidden>
      <span className={`h-px flex-1 ${oscuro ? "bg-white/15" : "bg-pt-border"}`} />o con tu email
      <span className={`h-px flex-1 ${oscuro ? "bg-white/15" : "bg-pt-border"}`} />
    </div>
  );
}
