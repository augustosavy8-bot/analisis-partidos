"use client";

import { useActionState } from "react";
import { pedirLink, type EstadoOlvide } from "./actions";
import { BotonMarca, Campo, ErrorForm } from "@/components/Campo";

export function FormOlvide() {
  const [estado, accion, pendiente] = useActionState<EstadoOlvide, FormData>(pedirLink, {});
  if (estado.enviado) {
    return (
      <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
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
