import { redirect } from "next/navigation";
import { PantallaCuenta } from "@/components/app/PantallaCuenta";
import { requerirUsuario } from "@/lib/panel";
import { DosPasos } from "./DosPasos";

export const metadata = { title: "Verificación en dos pasos", robots: { index: false } };

/** Superadmin: activar o pedir el código de la app autenticadora (Google Authenticator, 1Password…). */
export default async function PaginaDosPasos() {
  const { db, userId } = await requerirUsuario();
  const { data } = await db.from("superadmins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!data) redirect("/panel");
  const { data: nivel } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
  if (nivel?.currentLevel === "aal2") redirect("/admin");
  const activada = nivel?.nextLevel === "aal2";
  return (
    <PantallaCuenta
      titulo="Verificación en dos pasos"
      detalle={
        activada
          ? "Escribí el código de 6 números de tu app autenticadora."
          : "Tu cuenta de administrador necesita un segundo paso: escaneá el QR con Google Authenticator (o similar) y escribí el código."
      }
    >
      <DosPasos activada={activada} />
    </PantallaCuenta>
  );
}
