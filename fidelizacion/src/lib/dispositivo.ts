import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { after } from "next/server";
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

export type ClienteActual = {
  clienteId: string;
  nombre: string;
  /** Cumple (día y mes) si lo cargó. */
  cumple: { dia: number; mes: number } | null;
  /**
   * Este celular se vinculó hace menos de 24 hs a una cuenta que ya existía
   * (recuperó la tarjeta con el número). Hasta que haya código por WhatsApp, los
   * canjes desde un celular así piden el PIN de alguien del local.
   */
  recienVinculado: boolean;
};

const HORAS_VINCULO_RECIENTE = 24;

/** Devuelve el cliente dueño del token de dispositivo, o null. */
export async function clienteDesdeToken(token: string | undefined): Promise<ClienteActual | null> {
  if (!token || token.length > 100) return null;
  const db = crearClienteAdmin();
  const { data } = await db
    .from("dispositivos")
    .select("id, cliente_id, created_at, clientes(nombre, cumple_dia, cumple_mes, created_at)")
    .eq("token_hash", hashToken(token))
    .is("revocado_en", null)
    .maybeSingle();
  if (!data) return null;
  // Último uso: después de responder, para no demorar al cliente.
  after(async () => {
    await db.from("dispositivos").update({ ultimo_uso: new Date().toISOString() }).eq("id", data.id);
  });
  const c = data.clientes as unknown as { nombre: string; cumple_dia: number | null; cumple_mes: number | null; created_at: string } | null;
  const vinculado = new Date(data.created_at).getTime();
  // La cuenta ya existía (10 minutos de margen: el alta y el vínculo del primer toque van juntos).
  const cuentaPrevia = c ? new Date(c.created_at).getTime() < vinculado - 10 * 60_000 : false;
  return {
    recienVinculado: cuentaPrevia && Date.now() - vinculado < HORAS_VINCULO_RECIENTE * 3_600_000,
    clienteId: data.cliente_id,
    nombre: c?.nombre ?? "",
    cumple: c?.cumple_dia && c.cumple_mes ? { dia: c.cumple_dia, mes: c.cumple_mes } : null,
  };
}
