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
 * Da de alta (o reutiliza) al cliente, vincula este celular y aplica el toque
 * pendiente si lo hay. Sólo para Server Actions.
 */
export async function vincularCelular(opts: {
  nombre: string;
  whatsapp: string;
  localId: string;
}): Promise<{ clienteId: string; clienteExistia: boolean; resultado: ResultadoToque | null }> {
  const store = await cookies();
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

  let resultado: ResultadoToque | null = null;
  const toque = leerToquePendiente(store.get(COOKIE_TOQUE)?.value);
  if (toque && (await consumirToquePendiente(toque))) {
    resultado = await aplicarToque(data.cliente_id, toque);
  }
  store.delete(COOKIE_TOQUE);

  return { clienteId: data.cliente_id, clienteExistia: data.cliente_existia, resultado };
}
