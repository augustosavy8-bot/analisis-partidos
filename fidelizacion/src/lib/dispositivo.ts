import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

/** Cookie httpOnly que identifica el celular del cliente (sólo guardamos su hash). */
export const COOKIE_DISPOSITIVO = "fid_disp";
/** Cookie corta con el toque firmado, entre el toque y el formulario de registro. */
export const COOKIE_TOQUE = "fid_toque";

export function opcionesCookie(maxAgeSeg: number) {
  return {
    httpOnly: true,
    secure: env.esProduccion,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeg,
  };
}

/** 400 días: el máximo que aceptan los navegadores. */
export const DURACION_DISPOSITIVO = 400 * 24 * 60 * 60;

export function nuevoTokenDispositivo() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type ClienteActual = { clienteId: string; nombre: string };

/** Devuelve el cliente dueño del token de dispositivo, o null. */
export async function clienteDesdeToken(token: string | undefined): Promise<ClienteActual | null> {
  if (!token || token.length > 100) return null;
  const db = crearClienteAdmin();
  const { data } = await db
    .from("dispositivos")
    .select("id, cliente_id, clientes(nombre)")
    .eq("token_hash", hashToken(token))
    .is("revocado_en", null)
    .maybeSingle();
  if (!data) return null;
  // Actualización best-effort del último uso.
  void db.from("dispositivos").update({ ultimo_uso: new Date().toISOString() }).eq("id", data.id).then();
  const cliente = data.clientes as unknown as { nombre: string } | null;
  return { clienteId: data.cliente_id, nombre: cliente?.nombre ?? "" };
}
