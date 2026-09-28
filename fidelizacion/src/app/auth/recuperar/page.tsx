import { PantallaCuenta } from "@/components/app/PantallaCuenta";
import { Recuperar } from "./Recuperar";

export const metadata = { title: "Recuperar contraseña", robots: { index: false } };

export default function PaginaRecuperar() {
  return (
    <PantallaCuenta titulo="Recuperar contraseña">
      <Recuperar />
    </PantallaCuenta>
  );
}
