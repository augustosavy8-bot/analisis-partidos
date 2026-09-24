"use client";

import { useActionState } from "react";
import { recuperar, type EstadoForm } from "../registro/actions";
import { BotonMarca, Campo, ErrorForm } from "@/components/Campo";

export function FormRecuperar({ slug }: { slug: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(recuperar, {});
  return (
    <form action={accion} className="space-y-5">
      <input type="hidden" name="l" value={slug} />
      <Campo
        etiqueta="Tu WhatsApp"
        name="whatsapp"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        defaultValue={estado.valores?.whatsapp}
        placeholder="Ej: 341 123 4567"
        ayuda="El mismo número que usaste al crear tu tarjeta."
      />
      <ErrorForm mensaje={estado.error} />
      <BotonMarca type="submit" pendiente={pendiente}>
        Recuperar mi tarjeta
      </BotonMarca>
    </form>
  );
}
