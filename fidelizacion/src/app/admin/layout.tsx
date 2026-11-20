import { LogoPoint } from "@/components/MarcaPoint";
import Link from "next/link";
import { requerirSuperadmin } from "@/lib/admin";
import { BarraAdmin, LateralAdmin } from "./NavAdmin";

export const metadata = { title: { default: "Administración", template: "%s · Admin" }, robots: { index: false } };

export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  const { email } = await requerirSuperadmin();
  return (
    <div
      className="flex flex-1"
      style={{ ["--marca" as string]: "#1c1917", ["--marca-texto" as string]: "#ffffff", ["--marca-acento" as string]: "#e7e5e4" }}
    >
      <LateralAdmin email={email} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Celular: sólo el logo arriba; las secciones van en la barra de abajo. */}
        <header className="border-b border-stone-200 bg-white md:hidden">
          <div className="flex items-center px-4 py-3">
            <Link href="/admin" className="flex items-center gap-2 font-semibold">
              <LogoPoint alto={24} />
              <span className="ml-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">Admin</span>
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-6">{children}</main>
      </div>
      <BarraAdmin email={email} />
    </div>
  );
}
