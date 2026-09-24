import { Recuperar } from "./Recuperar";

export const metadata = { title: "Recuperar contraseña", robots: { index: false } };

export default function PaginaRecuperar() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Recuperar contraseña</h1>
      <Recuperar />
    </main>
  );
}
