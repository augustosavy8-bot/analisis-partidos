"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registrarComercio, type EstadoRegistro } from "./actions";
import { RUBROS } from "@/lib/interes";
import { CONDICIONES_FISCALES } from "@/lib/facturacion/registro";

const campo =
  "block h-12 w-full rounded-2xl border-0 bg-white/[0.06] px-4 text-base text-white outline-none ring-1 ring-inset ring-white/15 transition placeholder:text-white/40 focus:bg-white/[0.1] focus:ring-2 focus:ring-pt-accent";

export function FormRegistro({ plan }: { plan: string | null }) {
  const [estado, accion, pendiente] = useActionState<EstadoRegistro, FormData>(registrarComercio, {});
  const [fiscales, setFiscales] = useState(false);
  const v = estado.valores ?? {};

  if (estado.enviado !== undefined) {
    return (
      <div className="flex flex-col items-center py-8 text-center" role="status">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-pt-accent text-3xl text-pt-ink" aria-hidden>
          ✉
        </span>
        <p className="pt-h3 mt-5">Revisá tu email</p>
        <p className="mt-2 max-w-sm text-white/70">
          Te mandamos un link a <strong className="text-white">{estado.enviado}</strong> para confirmar tu cuenta. Abrilo desde este mismo
          navegador y seguís con la activación.
        </p>
        <p className="mt-4 max-w-sm text-sm text-white/50">
          ¿No llegó? Mirá en spam o promociones. Si ese email ya tenía una cuenta de Point, no te mandamos nada:{" "}
          <Link href="/panel/ingresar" className="text-white underline underline-offset-4">
            ingresá con tu contraseña
          </Link>{" "}
          o recuperala.
        </p>
      </div>
    );
  }

  return (
    <form action={accion} className="grid gap-3 sm:grid-cols-2">
      <input name="sitio" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <input type="hidden" name="plan" value={plan ?? ""} />
      <label className="block">
        <span className="text-sm text-white/70">Tu nombre</span>
        <input name="nombre" required maxLength={80} defaultValue={v.nombre} autoComplete="name" className={`mt-1 ${campo}`} />
      </label>
      <label className="block">
        <span className="text-sm text-white/70">Email</span>
        <input name="email" type="email" required maxLength={120} defaultValue={v.email} autoComplete="email" className={`mt-1 ${campo}`} />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-sm text-white/70">Contraseña</span>
        <input name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" className={`mt-1 ${campo}`} />
        <span className="mt-1 block text-xs text-white/50">Mínimo 8 caracteres.</span>
      </label>
      <label className="block">
        <span className="text-sm text-white/70">Nombre de tu local</span>
        <input name="comercio" required maxLength={60} defaultValue={v.comercio} className={`mt-1 ${campo}`} />
      </label>
      <label className="block">
        <span className="text-sm text-white/70">Rubro</span>
        <select name="rubro" required defaultValue={v.rubro ?? ""} className={`mt-1 ${campo} [&>option]:text-stone-900`}>
          <option value="" disabled>
            Elegí uno
          </option>
          {RUBROS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>

      <div className="sm:col-span-2">
        <button
          type="button"
          onClick={() => setFiscales((x) => !x)}
          aria-expanded={fiscales}
          className="text-sm font-semibold text-pt-accent underline decoration-pt-accent/40 underline-offset-4"
        >
          {fiscales ? "Ocultar datos fiscales" : "Agregar datos fiscales (opcional)"}
        </button>
      </div>
      {fiscales && (
        <>
          <label className="block sm:col-span-2">
            <span className="text-sm text-white/70">Razón social</span>
            <input name="razon_social" maxLength={120} defaultValue={v.razon_social} autoComplete="organization" className={`mt-1 ${campo}`} />
          </label>
          <label className="block">
            <span className="text-sm text-white/70">CUIT</span>
            <input name="cuit" inputMode="numeric" maxLength={13} defaultValue={v.cuit} placeholder="20-12345678-6" className={`mt-1 ${campo}`} />
          </label>
          <label className="block">
            <span className="text-sm text-white/70">Condición fiscal</span>
            <select name="condicion_fiscal" defaultValue={v.condicion_fiscal ?? ""} className={`mt-1 ${campo} [&>option]:text-stone-900`}>
              <option value="">Sin especificar</option>
              {Object.entries(CONDICIONES_FISCALES).map(([k, n]) => (
                <option key={k} value={k}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      <label className="flex items-start gap-3 text-sm text-white/70 sm:col-span-2">
        <input name="acepto" type="checkbox" required className="mt-0.5 h-5 w-5 accent-pt-accent" />
        <span>
          Acepto los términos del servicio y la{" "}
          <Link href="/privacidad" className="text-white underline underline-offset-4">
            política de privacidad
          </Link>
          .
        </span>
      </label>

      {estado.error && (
        <p className="rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-200 sm:col-span-2" role="alert">
          {estado.error}
        </p>
      )}
      <button
        disabled={pendiente}
        className="mt-1 h-14 rounded-2xl bg-pt-accent px-6 text-base font-semibold text-pt-ink transition hover:bg-pt-accent-dark active:scale-[0.99] disabled:opacity-60 sm:col-span-2"
      >
        {pendiente ? "Creando tu cuenta…" : "Crear mi cuenta"}
      </button>
      <p className="text-center text-xs text-white/50 sm:col-span-2">
        Al crear tu cuenta aceptás los{" "}
        <Link href="/terminos" className="text-white underline underline-offset-4">
          términos y condiciones
        </Link>{" "}
        y la{" "}
        <Link href="/privacidad" className="text-white underline underline-offset-4">
          política de privacidad
        </Link>
        .
      </p>
      <p className="text-center text-xs text-white/50 sm:col-span-2">
        ¿Ya tenés cuenta?{" "}
        <Link href="/panel/ingresar" className="text-white underline underline-offset-4">
          Ingresá
        </Link>
      </p>
    </form>
  );
}
