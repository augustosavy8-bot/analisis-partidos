import Link from "next/link";
import { Icono } from "@/components/Icono";
import type { AvisoCuenta } from "@/lib/facturacion/aviso-cuenta";

const TONOS = {
  info: "bg-pt-surface text-pt-ink ring-1 ring-inset ring-pt-border",
  aviso: "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200",
  grave: "bg-red-50 text-red-900 ring-1 ring-inset ring-red-200",
};

/** Cartel del estado de la cuenta (cobro fallido, pausa, cancelación) arriba del panel. */
export function EstadoCuenta({ aviso }: { aviso: AvisoCuenta }) {
  return (
    <div role={aviso.tono === "grave" ? "alert" : "status"} className={`mb-6 flex flex-col gap-3 rounded-pt-card p-4 sm:flex-row sm:items-center ${TONOS[aviso.tono]}`}>
      <Icono nombre={aviso.tono === "info" ? "historial" : "notificacion"} tamaño={20} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold">{aviso.titulo}</p>
        <p className="mt-0.5 text-[14px] leading-snug opacity-80">{aviso.texto}</p>
      </div>
      <Link
        href="/panel/facturacion"
        className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-pt-ink px-5 text-[14px] font-semibold text-white transition-colors hover:bg-black"
      >
        {aviso.boton}
      </Link>
    </div>
  );
}
