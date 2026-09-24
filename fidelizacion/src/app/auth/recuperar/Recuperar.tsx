"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { crearClienteNavegador } from "@/lib/supabase/browser";

/**
 * Destino del link de "olvidé mi contraseña". Toma la sesión que viene en la URL
 * (#access_token=… o ?code=…), la guarda en cookies y manda a elegir la contraseña nueva.
 */
export function Recuperar() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const db = crearClienteNavegador();
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);

    const listo = () => window.location.replace("/panel/nueva-contrasena");
    const fallo = (msg?: string | null) =>
      setError(
        msg?.toLowerCase().includes("expired") || msg?.toLowerCase().includes("invalid")
          ? "El link venció o ya se usó."
          : "No pudimos validar el link.",
      );

    (async () => {
      const errorUrl = hash.get("error_description") ?? query.get("error_description");
      if (errorUrl) return fallo(errorUrl);

      const access = hash.get("access_token");
      const refresh = hash.get("refresh_token");
      if (access && refresh) {
        const { error } = await db.auth.setSession({ access_token: access, refresh_token: refresh });
        return error ? fallo(error.message) : listo();
      }
      const code = query.get("code");
      if (code) {
        const { error } = await db.auth.exchangeCodeForSession(code);
        return error ? fallo(error.message) : listo();
      }
      fallo();
    })();
  }, []);

  if (!error) return <p className="text-stone-600">Validando el link…</p>;
  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error} Pedí uno nuevo y abrí sólo el último mail que te llegue.</p>
      <Link href="/panel/olvide" className="block text-center font-medium underline underline-offset-4">
        Pedir un link nuevo
      </Link>
    </div>
  );
}
