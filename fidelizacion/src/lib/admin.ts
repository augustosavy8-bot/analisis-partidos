import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { randomInt } from "node:crypto";
import { requerirUsuario } from "@/lib/panel";

/** Sólo superadmins. Para cualquier otro usuario la sección no existe (404). */
export const requerirSuperadmin = cache(async () => {
  const u = await requerirUsuario();
  const { data } = await u.db.from("superadmins").select("user_id").eq("user_id", u.userId).maybeSingle();
  if (!data) notFound();
  return u;
});

export const esSuperadmin = cache(async () => {
  const u = await requerirUsuario();
  const { data } = await u.db.from("superadmins").select("user_id").eq("user_id", u.userId).maybeSingle();
  return !!data;
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
