import Link from "next/link";
import { FormOlvide } from "./FormOlvide";

export const metadata = { title: "Recuperar contraseña", robots: { index: false } };

export default function Olvide() {
  return (
    <main
      className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16"
      style={{ ["--marca" as string]: "#1c1917", ["--marca-texto" as string]: "#ffffff" }}
    >
      <h1 className="text-2xl font-semibold tracking-tight">¿Olvidaste tu contraseña?</h1>
      <p className="mt-1 text-stone-600">Te mandamos un link a tu email para elegir una nueva.</p>
      <div className="mt-8">
        <FormOlvide />
      </div>
      <Link href="/panel/ingresar" className="mt-6 text-center text-sm text-stone-500 underline underline-offset-4">
        Volver a ingresar
      </Link>
    </main>
  );
}
