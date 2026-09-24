"use client";

import { useActionState } from "react";
import { cambiarContraseña, type EstadoNueva } from "./actions";
import { BotonMarca, Campo, ErrorForm } from "@/components/Campo";

export function FormNueva() {
  const [estado, accion, pendiente] = useActionState<EstadoNueva, FormData>(cambiarContraseña, {});
  return (
    <form action={accion} className="space-y-5">
      <Campo etiqueta="Contraseña nueva" name="password" type="password" autoComplete="new-password" minLength={8} required />
      <Campo etiqueta="Repetila" name="repetida" type="password" autoComplete="new-password" minLength={8} required />
      <ErrorForm mensaje={estado.error} />
      <BotonMarca type="submit" pendiente={pendiente}>Guardar contraseña</BotonMarca>
    </form>
  );
}
