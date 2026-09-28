"use client";

import { useActionState } from "react";
import { pedirLink, type EstadoOlvide } from "./actions";
import { BotonMarca, Campo, ErrorForm } from "@/components/Campo";

export function FormOlvide() {
  const [estado, accion, pendiente] = useActionState<EstadoOlvide, FormData>(pedirLink, {});
  if (estado.enviado) {
    return (
      <p role="status" className="rounded-pt-sm bg-pt-accent-soft p-4 pt-app-detalle text-pt-ink">
        Si ese email tiene usuario, te mandamos un link para elegir una contraseña nueva. Revisá también el spam.
      </p>
    );
  }
  return (
    <form action={accion} className="space-y-5">
      <Campo etiqueta="Email" name="email" type="email" autoComplete="email" required />
      <ErrorForm mensaje={estado.error} />
      <BotonMarca type="submit" pendiente={pendiente}>Mandarme el link</BotonMarca>
    </form>
  );
}
