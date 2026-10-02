import Link from "next/link";
import { PantallaCuenta } from "@/components/app/PantallaCuenta";
import { FormIngreso } from "./FormIngreso";
import { BotonGoogle, SeparadorO } from "@/components/app/BotonGoogle";
import { proveedoresActivos } from "@/lib/google-auth";

export const metadata = { title: "Ingresar al panel", robots: { index: false } };

export default async function Ingresar({ searchParams }: PageProps<"/panel/ingresar">) {
  const sp = await searchParams;
  const sociales = await proveedoresActivos();
  const aviso =
    sp.aviso === "confirmado"
      ? "¡Listo! Tu email quedó confirmado. Ingresá con tu contraseña para seguir."
      : sp.error === "link"
        ? "El link venció o ya se usó. Ingresá con tu email y contraseña."
        : null;

  return (
    <PantallaCuenta
      titulo="Panel del local"
      detalle="Ingresá con tu email y contraseña."
      pie={
        <span className="flex flex-col items-center gap-2">
          <Link href="/panel/olvide" className="font-medium text-pt-ink underline underline-offset-4">
            ¿Olvidaste tu contraseña?
          </Link>
          <span>
            ¿Todavía no tenés cuenta?{" "}
            <Link href="/sumate" className="font-medium text-pt-ink underline underline-offset-4">
              Creala acá
            </Link>
          </span>
        </span>
      }
    >
      {aviso && (
        <p className="mb-4 rounded-pt-sm bg-pt-accent-soft px-4 py-3 text-[14px] text-pt-accent-ink" role="status">
          {aviso}
        </p>
      )}
      {(sociales.google || sociales.apple) && (
        <div className="space-y-3">
          {sociales.apple && <BotonGoogle proveedor="apple" siguiente="/panel" />}
          {sociales.google && <BotonGoogle siguiente="/panel" />}
          <SeparadorO />
        </div>
      )}
      <FormIngreso />
    </PantallaCuenta>
  );
}
