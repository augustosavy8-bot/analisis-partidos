"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registrarse, type EstadoForm } from "./actions";
import { BotonMarca, Campo, ErrorForm } from "@/components/Campo";
import { SelectorCumple } from "@/components/SelectorCumple";
import { TarjetaVisual } from "@/components/TarjetaVisual";
import type { Local } from "@/lib/locales";

export function FormRegistro({ local, puntosIniciales }: { local: Local; puntosIniciales: number }) {
  const slug = local.slug;
  const puntosCumple = local.puntos_cumple;
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(registrarse, {});
  const [nombre, setNombre] = useState(estado.valores?.nombre ?? "");
  return (
    <form action={accion}>
      {/* La tarjeta se completa con el nombre mientras lo escribís */}
      <TarjetaVisual
        local={local}
        puntos={puntosIniciales}
        objetivo={null}
        titular={nombre}
        etiquetaPuntos={puntosIniciales === 1 ? "punto al crearla" : "puntos al crearla"}
      />
      <div className="superficie mt-5 space-y-5 p-5">
      <Campo
        onChange={(e) => setNombre(e.target.value)}
        etiqueta="Tu nombre"
        name="nombre"
        autoComplete="given-name"
        required
        maxLength={80}
        defaultValue={estado.valores?.nombre}
        placeholder="Ej: Sofi"
      />
      <Campo
        etiqueta="Tu WhatsApp"
        name="whatsapp"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        defaultValue={estado.valores?.whatsapp}
        placeholder="Ej: 341 123 4567"
        ayuda="Con código de área. Lo usamos para que recuperes tu tarjeta si cambiás de celular."
      />
      <div>
        <span className="text-sm font-medium text-stone-700">Tu cumple (opcional)</span>
        <div className="mt-1.5">
          <SelectorCumple dia={estado.valores?.cumple_dia} mes={estado.valores?.cumple_mes} />
        </div>
        <span className="mt-1 block text-xs text-stone-500">
          {puntosCumple > 0
            ? `La semana de tu cumple te regalamos ${puntosCumple} puntos. No hace falta el año.`
            : "Para saludarte. No hace falta el año."}
        </span>
      </div>
      <label className="flex items-start gap-3 text-sm text-stone-700">
        <input
          type="checkbox"
          name="consentimiento"
          required
          defaultChecked={estado.valores?.consentimiento === "on"}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-stone-300 accent-[var(--marca)]"
        />
        <span>
          Acepto la{" "}
          <Link href="/privacidad" target="_blank" className="font-medium underline underline-offset-2">
            política de privacidad
          </Link>{" "}
          y que el local guarde mis datos para mi tarjeta de puntos y me escriba por WhatsApp sobre mis puntos y promos.
        </span>
      </label>
      <ErrorForm mensaje={estado.error} />
      <BotonMarca type="submit" pendiente={pendiente}>
        Crear mi tarjeta y sumar
      </BotonMarca>
      </div>
      <p className="mt-5 text-center text-sm text-stone-500">
        ¿Ya tenías tarjeta?{" "}
        <Link href={`/recuperar?l=${slug}`} className="font-medium text-stone-800 underline underline-offset-2">
          Recuperala con tu WhatsApp
        </Link>
      </p>
    </form>
  );
}
