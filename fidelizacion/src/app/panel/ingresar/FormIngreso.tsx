"use client";

import { useActionState } from "react";
import { ingresar, type EstadoIngreso } from "./actions";
import { BotonMarca, Campo, ErrorForm } from "@/components/Campo";

export function FormIngreso() {
  const [estado, accion, pendiente] = useActionState<EstadoIngreso, FormData>(ingresar, {});
  return (
    <form action={accion} className="space-y-5">
      <Campo etiqueta="Email" name="email" type="email" autoComplete="email" required defaultValue={estado.email} />
      <Campo etiqueta="Contraseña" name="password" type="password" autoComplete="current-password" required />
      <ErrorForm mensaje={estado.error} />
      <BotonMarca type="submit" pendiente={pendiente}>
        Ingresar
      </BotonMarca>
    </form>
  );
}
