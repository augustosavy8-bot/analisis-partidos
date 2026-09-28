import Link from "next/link";
import { PantallaCuenta } from "@/components/app/PantallaCuenta";
import { FormOlvide } from "./FormOlvide";

export const metadata = { title: "Recuperar contraseña", robots: { index: false } };

export default function Olvide() {
  return (
    <PantallaCuenta
      titulo="¿Olvidaste tu contraseña?"
      detalle="Te mandamos un link a tu email para elegir una nueva."
      pie={
        <Link href="/panel/ingresar" className="font-medium text-pt-ink underline underline-offset-4">
          Volver a ingresar
        </Link>
      }
    >
      <FormOlvide />
    </PantallaCuenta>
  );
}
