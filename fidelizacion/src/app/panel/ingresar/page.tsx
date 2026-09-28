import Link from "next/link";
import { PantallaCuenta } from "@/components/app/PantallaCuenta";
import { FormIngreso } from "./FormIngreso";

export const metadata = { title: "Ingresar al panel", robots: { index: false } };

export default function Ingresar() {
  return (
    <PantallaCuenta
      titulo="Panel del local"
      detalle="Ingresá con el usuario que te dimos."
      pie={
        <Link href="/panel/olvide" className="font-medium text-pt-ink underline underline-offset-4">
          ¿Olvidaste tu contraseña?
        </Link>
      }
    >
      <FormIngreso />
    </PantallaCuenta>
  );
}
