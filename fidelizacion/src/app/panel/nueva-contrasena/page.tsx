import { requerirUsuario } from "@/lib/panel";
import { PantallaCuenta } from "@/components/app/PantallaCuenta";
import { FormNueva } from "./FormNueva";

export const metadata = { title: "Nueva contraseña", robots: { index: false } };

export default async function NuevaContraseña() {
  const { email } = await requerirUsuario();
  return (
    <PantallaCuenta titulo="Elegí tu contraseña" detalle={email}>
      <FormNueva />
    </PantallaCuenta>
  );
}
