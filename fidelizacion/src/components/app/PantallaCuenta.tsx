import { LogoPoint } from "@/components/landing/LogoPoint";

/** Pantallas de cuenta del panel (ingresar, contraseña): logo de Point + tarjeta con el formulario. */
export function PantallaCuenta({ titulo, detalle, children, pie }: { titulo: string; detalle?: React.ReactNode; children: React.ReactNode; pie?: React.ReactNode }) {
  return (
    <div className="pt-app flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-12">
        <LogoPoint alto={26} />
        <h1 className="pt-app-titulo mt-8 text-pt-ink">{titulo}</h1>
        {detalle && <p className="mt-1.5 pt-app-texto text-pt-ink-2">{detalle}</p>}
        <div className="mt-6 rounded-pt-card bg-pt-pure p-5 shadow-pt-ui ring-1 ring-pt-border/60">{children}</div>
        {pie && <div className="mt-5 text-center pt-app-detalle text-pt-ink-2">{pie}</div>}
      </main>
    </div>
  );
}
