import Link from "next/link";
import { Icono } from "@/components/Icono";

/**
 * Aviso de "esto es del plan Pro" (o de límite alcanzado) con el botón para
 * pasar de plan. Se muestra en el panel; el bloqueo real lo hace el servidor.
 */
export function MejorarPlan({
  titulo,
  children,
  boton = "Pasar a Pro",
  className = "",
}: {
  titulo: string;
  children: React.ReactNode;
  boton?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-3 rounded-pt-card bg-pt-ink p-5 text-white sm:flex-row sm:items-center ${className}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pt-accent text-pt-ink" aria-hidden>
        <Icono nombre="premio" tamaño={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-semibold">{titulo}</p>
        <p className="mt-0.5 text-[14px] leading-snug text-white/70">{children}</p>
      </div>
      <Link
        href="/panel/facturacion#plan"
        className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-pt-accent px-5 text-[14px] font-semibold text-pt-ink transition-colors hover:bg-pt-accent-dark"
      >
        {boton}
      </Link>
    </div>
  );
}
