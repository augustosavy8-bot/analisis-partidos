import Link from "next/link";
import { redirect } from "next/navigation";
import { localesDelUsuario, requerirUsuario } from "@/lib/panel";
import { esSuperadmin } from "@/lib/admin";
import { salir } from "./ingresar/actions";
import { LogoPoint } from "@/components/landing/LogoPoint";
import { Encabezado, Lista } from "@/components/app/Superficie";
import { BotonLink, claseBoton } from "@/components/app/Boton";
import { Vacio } from "@/components/Panel";
import { Icono } from "@/components/Icono";
import { completarRegistroPendiente } from "@/lib/facturacion/registro-servidor";
import { comercioDelUsuario, suscripcionVigente } from "@/lib/facturacion/comercio";

export const metadata = { title: "Panel", robots: { index: false } };

export default async function Panel() {
  const { email } = await requerirUsuario();
  // Recién confirmó el email: se crea su comercio con el primer local.
  await completarRegistroPendiente();
  const [locales, superadmin, comercio] = await Promise.all([localesDelUsuario(), esSuperadmin(), comercioDelUsuario()]);
  // Comercio sin suscripción (ni cortesía): primero tiene que activar la cuenta.
  if (comercio && !superadmin && !(await suscripcionVigente(comercio.id))) redirect("/panel/facturacion");
  // Entró con Google por primera vez: todavía no cargó los datos de su comercio.
  if (!comercio && !superadmin && locales.length === 0) redirect("/panel/completar");
  if (locales.length === 1 && !superadmin) redirect(`/panel/${locales[0].slug}`);

  return (
    <div className="pt-app flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-5 py-12">
        <LogoPoint alto={24} />
        <div className="mt-8">
          <Encabezado titulo="Tus locales" detalle={email} />
        </div>
        {superadmin && (
          <Link href="/admin" className="mb-4 flex items-center justify-between rounded-pt-card bg-pt-ink px-5 py-4 text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-pt-ink/85">
            Administración (superadmin) <Icono nombre="chevron" tamaño={18} />
          </Link>
        )}
        {locales.length === 0 ? (
          <Vacio titulo="Todavía no tenés locales" ilustracion={false}>
            Tu usuario todavía no tiene ningún local asignado. Escribinos y lo dejamos listo.
          </Vacio>
        ) : (
          <Lista>
            {locales.map((l) => (
              <li key={l.id}>
                <Link href={`/panel/${l.slug}`} className="flex items-center gap-3 px-5 py-4 text-[15px] font-medium text-pt-ink transition-colors duration-150 hover:bg-pt-bg">
                  <span className="flex h-9 w-9 items-center justify-center rounded-pt-sm bg-pt-ink font-[family-name:var(--font-pt-display)] font-bold text-white" aria-hidden>
                    {l.nombre.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1">{l.nombre}</span>
                  <Icono nombre="chevron" tamaño={18} className="text-pt-ink-2" />
                </Link>
              </li>
            ))}
          </Lista>
        )}
        <div className="mt-8 flex flex-wrap gap-2">
          <BotonLink href="/panel/nueva-contrasena" variante="secundario" tamaño="sm">
            Cambiar mi contraseña
          </BotonLink>
          <form action={salir}>
            <button className={claseBoton("fantasma", "sm")}>
              <Icono nombre="salir" tamaño={16} /> Salir
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
