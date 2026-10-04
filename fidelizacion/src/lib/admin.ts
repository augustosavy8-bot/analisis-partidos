import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { randomInt } from "node:crypto";
import { requerirUsuario } from "@/lib/panel";

/** ¿La sesión ya pasó la verificación en dos pasos (código de la app autenticadora)? */
async function conDosPasos(db: Awaited<ReturnType<typeof requerirUsuario>>["db"]) {
  const { data } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.currentLevel === "aal2";
}

/**
 * Sólo superadmins. Para cualquier otro usuario la sección no existe (404).
 * Exige verificación en dos pasos: con sólo la contraseña no se entra al admin.
 */
export const requerirSuperadmin = cache(async () => {
  const u = await requerirUsuario();
  const { data } = await u.db.from("superadmins").select("user_id").eq("user_id", u.userId).maybeSingle();
  if (!data) notFound();
  if (!(await conDosPasos(u.db))) redirect("/auth/dos-pasos");
  return u;
});

/** Superadmin con la verificación en dos pasos hecha. Si le falta el código, va a pedirlo. */
export const esSuperadmin = cache(async () => {
  const u = await requerirUsuario();
  const { data } = await u.db.from("superadmins").select("user_id").eq("user_id", u.userId).maybeSingle();
  if (!data) return false;
  if (!(await conDosPasos(u.db))) redirect("/auth/dos-pasos");
  return true;
});

const PALABRAS = ["cafe", "mate", "luna", "sol", "tango", "rio", "pampa", "faro", "nube", "limon", "canela", "brisa"];
/** Contraseña temporal fácil de dictar: palabra-palabra-1234. */
export function contraseñaTemporal() {
  const p = () => PALABRAS[randomInt(PALABRAS.length)];
  return `${p()}-${p()}-${randomInt(1000, 10000)}`;
}

export function slugDesde(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
