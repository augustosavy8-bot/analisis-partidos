import { FormIngreso } from "./FormIngreso";

export const metadata = { title: "Ingresar al panel", robots: { index: false } };

export default function Ingresar() {
  return (
    <main
      className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16"
      style={{ ["--marca" as string]: "#1c1917", ["--marca-texto" as string]: "#ffffff" }}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-xl font-semibold text-white">
        +1
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Panel del local</h1>
      <p className="mt-1 text-stone-600">Ingresá con el usuario que te dimos.</p>
      <div className="mt-8">
        <FormIngreso />
      </div>
    </main>
  );
}
