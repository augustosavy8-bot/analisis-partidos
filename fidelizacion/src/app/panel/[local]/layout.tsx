import Link from "next/link";
import { localesDelUsuario, requerirLocal } from "@/lib/panel";
import { LogoLocal } from "@/components/CabeceraLocal";
import { Icono } from "@/components/Icono";
import { Toasts } from "@/components/app/Toasts";
import { Dialogos } from "@/components/app/Dialogos";
import { MotionProvider } from "@/components/landing/MotionProvider";
import { salir } from "../ingresar/actions";
import { NavPanel } from "./NavPanel";
import { BotonTema } from "@/components/app/BotonTema";
import { formasTermino } from "@/lib/terminos";
import { EstadoCuenta } from "@/components/app/EstadoCuenta";
import { accesoDelLocal } from "@/lib/facturacion/acceso-servidor";
import { avisoDeCuenta } from "@/lib/facturacion/aviso-cuenta";

export default async function LayoutPanel({ children, params }: LayoutProps<"/panel/[local]">) {
  const { local: slug } = await params;
  const { local, email } = await requerirLocal(slug);
  const locales = await localesDelUsuario();
  const personal = formasTermino(local.termino_personal).Plural;
  const aviso = avisoDeCuenta(await accesoDelLocal(local.id));

  const cuenta = (
    <div className="flex items-center gap-2">
      {locales.length > 1 && (
        <Link href="/panel" className="flex h-pt-control-sm items-center rounded-full px-3 text-[13px] font-semibold text-pt-ink-2 transition-colors duration-150 hover:bg-pt-surface hover:text-pt-ink">
          Cambiar local
        </Link>
      )}
      <form action={salir}>
        <button className="flex h-pt-control-sm items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-pt-ink-2 transition-colors duration-150 hover:bg-pt-surface hover:text-pt-ink">
          <Icono nombre="salir" tamaño={16} /> Salir
        </button>
      </form>
    </div>
  );

  return (
    <div className="pt-app flex flex-1 flex-col">
      <MotionProvider>
        <header className="sticky top-0 z-30 border-b border-pt-border/80 bg-pt-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
          <div className="mx-auto w-full max-w-5xl px-4 py-3 md:pb-0">
            <div className="flex items-center gap-3">
              <LogoLocal local={local} tamaño={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold leading-tight text-pt-ink">{local.nombre}</p>
                <p className="truncate pt-app-detalle text-pt-ink-2">{email}</p>
              </div>
              <BotonTema />
              <div className="hidden md:block">{cuenta}</div>
            </div>
            <div className="hidden md:mt-3 md:block md:pb-3">
              <NavPanel vista="escritorio" slug={slug} personal={personal} />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-[calc(var(--spacing-pt-tabbar)+env(safe-area-inset-bottom)+2rem)] md:pb-12">
          {aviso && <EstadoCuenta aviso={aviso} />}
          {children}
        </main>
        <NavPanel vista="movil" slug={slug} personal={personal} cuenta={cuenta} />
        <Toasts />
        <Dialogos />
      </MotionProvider>
    </div>
  );
}
