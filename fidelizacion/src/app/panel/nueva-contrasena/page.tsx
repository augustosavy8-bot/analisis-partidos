import { requerirUsuario } from "@/lib/panel";
import { FormNueva } from "./FormNueva";

export const metadata = { title: "Nueva contraseña", robots: { index: false } };

export default async function NuevaContraseña() {
  const { email } = await requerirUsuario();
  return (
    <main
      className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16"
      style={{ ["--marca" as string]: "#1c1917", ["--marca-texto" as string]: "#ffffff" }}
    >
      <h1 className="text-2xl font-semibold tracking-tight">Elegí tu contraseña</h1>
      <p className="mt-1 text-stone-600">{email}</p>
      <div className="mt-8">
        <FormNueva />
      </div>
    </main>
  );
}
