"use client";

import { useActionState } from "react";
import { registrarInteres, type EstadoInteres } from "./actions";
import { RUBROS } from "@/lib/interes";
import { CheckCanje } from "@/components/Animaciones";

const campo =
  "block h-12 w-full rounded-2xl border-0 bg-white/[0.06] px-4 text-base text-white outline-none ring-1 ring-inset ring-white/15 transition placeholder:text-white/40 focus:bg-white/[0.1] focus:ring-2 focus:ring-[#E6633A]";

export function FormInteres() {
  const [estado, accion, pendiente] = useActionState<EstadoInteres, FormData>(registrarInteres, {});
  const v = estado.valores ?? {};

  if (estado.ok) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <CheckCanje color="#E6633A" tamaño={96} />
        <p className="mt-4 font-[family-name:var(--font-poppins)] text-2xl font-bold">¡Gracias!</p>
        <p className="mt-2 max-w-xs text-white/70">Te escribimos por WhatsApp en menos de 24 horas para contarte cómo empezar.</p>
      </div>
    );
  }

  return (
    <form action={accion} className="grid gap-3 sm:grid-cols-2">
      <input name="sitio" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <label className="block">
        <span className="text-sm text-white/70">Tu nombre</span>
        <input name="nombre" required maxLength={80} defaultValue={v.nombre} autoComplete="name" className={`mt-1 ${campo}`} />
      </label>
      <label className="block">
        <span className="text-sm text-white/70">Nombre del local</span>
        <input name="local" required maxLength={80} defaultValue={v.local} className={`mt-1 ${campo}`} />
      </label>
      <label className="block">
        <span className="text-sm text-white/70">Rubro</span>
        <select name="rubro" required defaultValue={v.rubro ?? ""} className={`mt-1 ${campo} [&>option]:text-stone-900`}>
          <option value="" disabled>Elegí uno</option>
          {RUBROS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm text-white/70">Ciudad</span>
        <input name="ciudad" maxLength={60} defaultValue={v.ciudad} placeholder="Ej: Rosario" className={`mt-1 ${campo}`} />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-sm text-white/70">WhatsApp</span>
        <input name="whatsapp" type="tel" inputMode="tel" required defaultValue={v.whatsapp} placeholder="Ej: 341 123 4567" autoComplete="tel" className={`mt-1 ${campo}`} />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-sm text-white/70">¿Algo que quieras contarnos? (opcional)</span>
        <textarea
          name="mensaje"
          maxLength={500}
          rows={3}
          defaultValue={v.mensaje}
          placeholder="Cuántos clientes atendés, si ya usás alguna tarjeta de puntos…"
          className={`mt-1 ${campo} h-auto py-3`}
        />
      </label>
      {estado.error && <p className="rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-200 sm:col-span-2">{estado.error}</p>}
      <button
        disabled={pendiente}
        className="mt-1 h-14 rounded-2xl bg-[#E6633A] px-6 text-base font-semibold text-white shadow-[0_12px_30px_-12px_#E6633A] transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60 sm:col-span-2"
      >
        {pendiente ? "Enviando…" : "Quiero sumar mi local"}
      </button>
      <p className="text-center text-xs text-white/50 sm:col-span-2">Sin compromiso. Te contactamos solo para contarte de Point.</p>
    </form>
  );
}
