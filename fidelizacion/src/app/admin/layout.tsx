import Link from "next/link";
import { requerirSuperadmin } from "@/lib/admin";
import { salir } from "../panel/ingresar/actions";

export const metadata = { title: { default: "Administración", template: "%s · Admin" }, robots: { index: false } };

export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  const { email } = await requerirSuperadmin();
  return (
    <div
      className="flex flex-1 flex-col"
      style={{ ["--marca" as string]: "#1c1917", ["--marca-texto" as string]: "#ffffff", ["--marca-acento" as string]: "#e7e5e4" }}
    >
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-sm text-white">+1</span>
            Administración
          </Link>
          <nav className="flex gap-4 text-sm text-stone-600">
            <Link href="/admin" className="hover:text-stone-900">Estado</Link>
            <Link href="/admin/locales/nuevo" className="hover:text-stone-900">Nuevo local</Link>
            <Link href="/panel" className="hover:text-stone-900">Paneles</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-stone-500">
            <span className="hidden sm:inline">{email}</span>
            <form action={salir}>
              <button className="underline underline-offset-4">Salir</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
