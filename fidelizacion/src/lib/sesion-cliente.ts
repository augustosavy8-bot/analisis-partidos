import "server-only";
import { cookies, headers } from "next/headers";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import {
  COOKIE_DISPOSITIVO,
  COOKIE_TOQUE,
  DURACION_DISPOSITIVO,
  clienteDesdeToken,
  nuevoTokenDispositivo,
  opcionesCookie,
} from "@/lib/dispositivo";
import {
  aplicarToque,
  consumirToquePendiente,
  leerToquePendiente,
  type ResultadoToque,
} from "@/lib/toque";

/** Cliente del celular actual (para Server Components y Server Actions). */
export async function clienteActual() {
  const store = await cookies();
  return clienteDesdeToken(store.get(COOKIE_DISPOSITIVO)?.value);
}

export async function toquePendienteActual() {
  const store = await cookies();
  return leerToquePendiente(store.get(COOKIE_TOQUE)?.value);
}

/**
 * Usa el toque pendiente (un solo uso: si ya se usó o venció, devuelve null y no
 * hace nada), da de alta (o reutiliza) al cliente, vincula este celular y aplica
 * el toque. El toque se marca usado ANTES del alta: así un mismo toque no sirve
 * para dar de alta números ajenos ni para entrar a varias tarjetas. Sólo para
 * Server Actions.
 */
export async function vincularCelular(opts: {
  nombre: string;
  whatsapp: string;
  localId: string;
}): Promise<{ clienteId: string; clienteExistia: boolean; resultado: ResultadoToque } | null> {
  const store = await cookies();
  const toque = leerToquePendiente(store.get(COOKIE_TOQUE)?.value);
  store.delete(COOKIE_TOQUE);
  if (!toque || !(await consumirToquePendiente(toque))) return null;

  const ua = (await headers()).get("user-agent") ?? "";
  const { token, hash } = nuevoTokenDispositivo();
  const db = crearClienteAdmin();
  const { data, error } = await db.rpc("alta_cliente", {
    p_nombre: opts.nombre,
    p_whatsapp: opts.whatsapp,
    p_local_id: opts.localId,
    p_token_hash: hash,
    p_user_agent: ua,
  });
  if (error || !data) throw new Error(error?.message ?? "No se pudo registrar");

  store.set(COOKIE_DISPOSITIVO, token, opcionesCookie(DURACION_DISPOSITIVO));
  const resultado = await aplicarToque(data.cliente_id, toque);
  return { clienteId: data.cliente_id, clienteExistia: data.cliente_existia, resultado };
}
