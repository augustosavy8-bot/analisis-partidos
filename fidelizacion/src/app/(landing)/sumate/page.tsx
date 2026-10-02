import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/Nav";
import { FormInteres } from "@/app/interes/FormInteres";
import { FormRegistro } from "./FormRegistro";
import { BotonGoogle, SeparadorO } from "@/components/app/BotonGoogle";
import { proveedoresActivos } from "@/lib/google-auth";

export const metadata: Metadata = { title: "Sumá tu local" };

/**
 * Registro propio del comercio (email + contraseña, con verificación). Quien
 * prefiera que lo ayudemos puede dejar sus datos (?modo=contacto).
 */
export default async function Sumate({ searchParams }: PageProps<"/sumate">) {
  const sp = await searchParams;
  const contacto = sp.modo === "contacto";
  const plan = typeof sp.plan === "string" ? sp.plan : null;
  const sociales = await proveedoresActivos();
  const siguienteSocial = `/panel/completar${plan && /^[a-z0-9_]{2,30}$/.test(plan) ? `?plan=${plan}` : ""}`;

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-[760px] px-5 pb-24 pt-28 md:pt-36">
        {contacto ? (
          <>
            <h1 className="pt-h1 text-pt-ink">Te ayudamos a empezar.</h1>
            <p className="pt-lead mt-4 text-pt-ink-2">Dejanos tus datos y te escribimos por WhatsApp para armar tu programa.</p>
            <div className="mt-10 rounded-pt-lg bg-pt-ink p-6 text-white shadow-pt-product md:p-10">
              <FormInteres />
            </div>
            <p className="mt-6 text-center pt-ui text-pt-ink-2">
              <Link href="/sumate" className="underline underline-offset-4 hover:text-pt-ink">
                Prefiero crear mi cuenta ahora
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="pt-h1 text-pt-ink">Sumá tu local.</h1>
            <p className="pt-lead mt-4 text-pt-ink-2">
              Creá tu cuenta en un minuto. Después elegís el plan y empezás tu prueba gratis.
            </p>
            <div className="mt-10 rounded-pt-lg bg-pt-ink p-6 text-white shadow-pt-product md:p-10">
              {(sociales.google || sociales.apple) && (
                <div className="space-y-3">
                  {sociales.apple && <BotonGoogle oscuro proveedor="apple" siguiente={siguienteSocial} />}
                  {sociales.google && <BotonGoogle oscuro siguiente={siguienteSocial} />}
                  <SeparadorO oscuro />
                </div>
              )}
              <FormRegistro plan={plan} />
            </div>
            <p className="mt-6 text-center pt-ui text-pt-ink-2">
              ¿Preferís que te ayudemos?{" "}
              <Link href="/sumate?modo=contacto" className="underline underline-offset-4 hover:text-pt-ink">
                Dejanos tus datos
              </Link>
            </p>
          </>
        )}
      </main>
    </>
  );
}
