"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registrarse, type EstadoForm } from "./actions";
import { BotonMarca, Campo, ErrorForm } from "@/components/Campo";
import { SelectorCumple } from "@/components/SelectorCumple";
import { AyudaCampo, EtiquetaCampo, claseCheckbox } from "@/components/app/Campos";
import { Superficie } from "@/components/app/Superficie";
import { PointCard3D } from "@/components/landing/PointCard3D";
import type { Local } from "@/lib/locales";

export function FormRegistro({ local, puntosIniciales }: { local: Local; puntosIniciales: number }) {
  const slug = local.slug;
  const puntosCumple = local.puntos_cumple;
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(registrarse, {});
  const [nombre, setNombre] = useState(estado.valores?.nombre ?? "");
  const primerNombre = nombre.trim().split(" ")[0];
  return (
    <form action={accion}>
      {/* La tarjeta se completa con el nombre mientras lo escribís */}
      <div className="mt-6">
        <PointCard3D
          modo="app"
          comercio={local.nombre}
          inicial={local.nombre.charAt(0).toUpperCase()}
          logo={local.logo_url}
          puntos={puntosIniciales}
          meta={null}
          leyenda={primerNombre ? `La tarjeta de ${primerNombre}` : "Tu nombre va acá"}
        />
      </div>
      <Superficie className="mt-6 space-y-5 p-5">
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
          <EtiquetaCampo>Tu cumple (opcional)</EtiquetaCampo>
          <SelectorCumple dia={estado.valores?.cumple_dia} mes={estado.valores?.cumple_mes} />
          <AyudaCampo>
            {puntosCumple > 0
              ? `La semana de tu cumple te regalamos ${puntosCumple} puntos. No hace falta el año.`
              : "Para saludarte. No hace falta el año."}
          </AyudaCampo>
        </div>
        <label className="flex items-start gap-3 pt-app-detalle text-pt-ink-2">
          <input type="checkbox" name="consentimiento" required defaultChecked={estado.valores?.consentimiento === "on"} className={`mt-0.5 ${claseCheckbox}`} />
          <span>
            Acepto la{" "}
            <Link href="/privacidad" target="_blank" className="font-medium text-pt-ink underline underline-offset-2">
              política de privacidad
            </Link>{" "}
            y que el local guarde mis datos para mi tarjeta de puntos y me escriba por WhatsApp sobre mis puntos y promos.
          </span>
        </label>
        <ErrorForm mensaje={estado.error} />
        <BotonMarca type="submit" pendiente={pendiente}>
          Crear mi tarjeta y sumar
        </BotonMarca>
      </Superficie>
      <p className="mt-5 text-center pt-app-detalle text-pt-ink-2">
        ¿Ya tenías tarjeta?{" "}
        <Link href={`/recuperar?l=${slug}`} className="font-medium text-pt-ink underline underline-offset-2">
          Recuperala con tu WhatsApp
        </Link>
      </p>
    </form>
  );
}
