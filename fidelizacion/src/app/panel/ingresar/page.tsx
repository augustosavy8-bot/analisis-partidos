import Link from "next/link";
import { FormIngreso } from "./FormIngreso";

export const metadata = { title: "Ingresar al panel", robots: { index: false } };

export default function Ingresar() {
  return (
    <main
      className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16"
      style={{ ["--marca" as string]: "#1c1917", ["--marca-texto" as string]: "#ffffff" }}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-900 text-white">
          <span className="h-3 w-3 rounded-full bg-lime-300" aria-hidden />
        </div>
        <span className="text-2xl font-semibold tracking-tight text-stone-900">Point</span>
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Panel del local</h1>
      <p className="mt-1 text-stone-600">Ingresá con el usuario que te dimos.</p>
      <div className="mt-8">
        <FormIngreso />
      </div>
      <Link href="/panel/olvide" className="mt-6 text-center text-sm text-stone-500 underline underline-offset-4">
        ¿Olvidaste tu contraseña?
      </Link>
    </main>
  );
}
