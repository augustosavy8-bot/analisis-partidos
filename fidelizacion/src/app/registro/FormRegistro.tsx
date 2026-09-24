"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registrarse, type EstadoForm } from "./actions";
import { BotonMarca, Campo, ErrorForm } from "@/components/Campo";

export function FormRegistro({ slug }: { slug: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(registrarse, {});
  return (
    <form action={accion} className="space-y-5">
      <Campo
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
          y que el local guarde mis datos para mi tarjeta de puntos.
        </span>
      </label>
      <ErrorForm mensaje={estado.error} />
      <BotonMarca type="submit" pendiente={pendiente}>
        Crear mi tarjeta y sumar
      </BotonMarca>
      <p className="text-center text-sm text-stone-500">
        ¿Ya tenías tarjeta?{" "}
        <Link href={`/recuperar?l=${slug}`} className="font-medium text-stone-800 underline underline-offset-2">
          Recuperala con tu WhatsApp
        </Link>
      </p>
    </form>
  );
}
