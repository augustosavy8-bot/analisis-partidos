import Link from "next/link";
import { redirect } from "next/navigation";
import { localesDelUsuario, requerirUsuario } from "@/lib/panel";
import { esSuperadmin } from "@/lib/admin";
import { salir } from "./ingresar/actions";

export const metadata = { title: "Panel", robots: { index: false } };

export default async function Panel() {
  const { email } = await requerirUsuario();
  const [locales, superadmin] = await Promise.all([localesDelUsuario(), esSuperadmin()]);
  if (locales.length === 1 && !superadmin) redirect(`/panel/${locales[0].slug}`);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Tus locales</h1>
      <p className="mt-1 text-sm text-stone-500">{email}</p>
      {superadmin && (
        <Link href="/admin" className="mt-6 flex items-center justify-between rounded-2xl bg-stone-900 px-5 py-4 font-medium text-white">
          Administración (superadmin) <span>→</span>
        </Link>
      )}
      {locales.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-white p-5 text-stone-600 ring-1 ring-stone-200">
          Tu usuario todavía no tiene ningún local asignado.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200">
          {locales.map((l) => (
            <li key={l.id}>
              <Link href={`/panel/${l.slug}`} className="flex items-center justify-between px-5 py-4 font-medium">
                {l.nombre} <span className="text-stone-400">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href="/panel/nueva-contrasena" className="mt-8 block text-sm text-stone-500 underline underline-offset-4">
        Cambiar mi contraseña
      </Link>
      <form action={salir} className="mt-3">
        <button className="text-sm text-stone-500 underline underline-offset-4">Salir</button>
      </form>
    </main>
  );
}
