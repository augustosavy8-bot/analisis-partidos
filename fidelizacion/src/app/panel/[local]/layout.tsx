import Link from "next/link";
import { estiloMarca } from "@/lib/locales";
import { localesDelUsuario, requerirLocal } from "@/lib/panel";
import { LogoLocal } from "@/components/CabeceraLocal";
import { salir } from "../ingresar/actions";
import { NavPanel } from "./NavPanel";

export default async function LayoutPanel({ children, params }: LayoutProps<"/panel/[local]">) {
  const { local: slug } = await params;
  const { local, email } = await requerirLocal(slug);
  const locales = await localesDelUsuario();

  return (
    <div style={estiloMarca(local)} className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-[#fafaf9]/90 backdrop-blur">
        <div className="mx-auto w-full max-w-5xl px-4 pt-4">
          <div className="flex items-center gap-3">
            <LogoLocal local={local} tamaño={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold leading-tight">{local.nombre}</p>
              <p className="truncate text-xs text-stone-500">{email}</p>
            </div>
            {locales.length > 1 && (
              <Link href="/panel" className="text-sm text-stone-500 underline underline-offset-4">
                Cambiar
              </Link>
            )}
            <form action={salir}>
              <button className="text-sm text-stone-500 underline underline-offset-4">Salir</button>
            </form>
          </div>
          <div className="mt-3 pb-3">
            <NavPanel slug={slug} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
