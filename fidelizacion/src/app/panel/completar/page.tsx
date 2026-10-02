import { redirect } from "next/navigation";
import { PantallaCuenta } from "@/components/app/PantallaCuenta";
import { localesDelUsuario, requerirUsuario } from "@/lib/panel";
import { esSuperadmin } from "@/lib/admin";
import { comercioDelUsuario } from "@/lib/facturacion/comercio";
import { completarRegistroPendiente } from "@/lib/facturacion/registro-servidor";
import { FormCompletar } from "./FormCompletar";

export const metadata = { title: "Contanos de tu comercio", robots: { index: false } };

/**
 * Primer ingreso con Google: Google nos da el email y el nombre, pero no los
 * datos del comercio. Se piden acá una sola vez; después sigue a Facturación.
 */
export default async function Completar({ searchParams }: PageProps<"/panel/completar">) {
  const { email } = await requerirUsuario();
  await completarRegistroPendiente(); // si se registró con email, ya tiene los datos
  const [comercio, locales, superadmin] = await Promise.all([comercioDelUsuario(), localesDelUsuario(), esSuperadmin()]);
  if (comercio || locales.length || superadmin) redirect("/panel");
  const sp = await searchParams;
  const plan = typeof sp.plan === "string" && /^[a-z0-9_]{2,30}$/.test(sp.plan) ? sp.plan : null;

  return (
    <PantallaCuenta titulo="Contanos de tu comercio" detalle={<>Entraste como {email}. Es una sola vez.</>}>
      <FormCompletar plan={plan} />
    </PantallaCuenta>
  );
}
