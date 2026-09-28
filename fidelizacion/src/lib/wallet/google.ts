import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { proximoPremio } from "@/lib/tarjeta";
import type { DatosPase, ProveedorWallet } from "./index";
import {
  idObjeto,
  jwtGuardar,
  patchObjeto,
  upsertClase,
  upsertObjeto,
  urlGuardar,
  type TarjetaGoogle,
} from "./google-core";

/** ¿Hay credenciales válidas de Google Wallet? Sin ellas, todo esto no hace nada. */
export function googleWalletActivo() {
  return env.googleWallet !== null;
}

/**
 * Crea o actualiza la loyaltyClass del local (nombre, logo, colores, cabecera y premios).
 * Se llama al crear/editar el local o sus premios (con after()) y desde el script de sync.
 * Nunca lanza: si falla, queda en el log.
 */
export async function sincronizarClaseLocal(localId: string) {
  const cred = env.googleWallet;
  if (!cred) return;
  try {
    const db = crearClienteAdmin();
    const [{ data: local }, { data: premios }] = await Promise.all([
      db.from("locales").select("slug, nombre, logo_url, color_primario").eq("id", localId).maybeSingle(),
      db.from("premios").select("nombre, puntos_necesarios").eq("local_id", localId).eq("activo", true).order("puntos_necesarios"),
    ]);
    if (!local) return;
    await upsertClase(
      cred,
      {
        slug: local.slug,
        nombre: local.nombre,
        logoUrl: local.logo_url,
        colorPrimario: local.color_primario,
        premios: (premios ?? []).map((p) => ({ nombre: p.nombre, puntos: p.puntos_necesarios })),
      },
      env.appUrl,
    );
  } catch (e) {
    console.error("Google Wallet: no se pudo sincronizar la clase", localId, e);
  }
}

/** Datos del objeto a partir del serial (tarjeta, cliente, local y próximo premio). */
async function datosTarjeta(serial: string, soloRegistradas: boolean): Promise<TarjetaGoogle | null> {
  const db = crearClienteAdmin();
  let consulta = db
    .from("tarjetas")
    .select(
      `local_id, serial, wallet_auth_token, puntos, clientes(nombre), locales(slug, nombre)${soloRegistradas ? ", wallet_registros!inner(plataforma)" : ""}`,
    )
    .eq("serial", serial);
  if (soloRegistradas) consulta = consulta.eq("wallet_registros.plataforma", "google");
  const { data } = await consulta.limit(1).maybeSingle();
  if (!data) return null;
  const t = data as unknown as {
    local_id: string;
    serial: string;
    wallet_auth_token: string;
    puntos: number;
    clientes: { nombre: string } | null;
    locales: { slug: string; nombre: string } | null;
  };
  if (!t.locales) return null;
  const { data: premios } = await db
    .from("premios")
    .select("id, nombre, descripcion, puntos_necesarios")
    .eq("local_id", t.local_id)
    .eq("activo", true)
    .order("puntos_necesarios");
  const proximo = proximoPremio(premios ?? [], t.puntos);
  return {
    serial: t.serial,
    token: t.wallet_auth_token,
    puntos: t.puntos,
    clienteNombre: t.clientes?.nombre ?? "",
    localSlug: t.locales.slug,
    localNombre: t.locales.nombre,
    proximo: proximo ? { nombre: proximo.nombre, puntos: proximo.puntos_necesarios } : null,
  };
}

export const proveedorGoogle: ProveedorWallet = {
  plataforma: "google",

  /**
   * Crea o actualiza el loyaltyObject por API y devuelve el link "Guardar en
   * Google Wallet" con un JWT skinny (sólo el id del objeto).
   */
  async generarPase(datos: DatosPase) {
    const cred = env.googleWallet;
    if (!cred) throw new Error("Google Wallet no está configurado");
    await upsertObjeto(
      cred,
      {
        serial: datos.serial,
        token: datos.token,
        puntos: datos.puntos,
        clienteNombre: datos.clienteNombre,
        localSlug: datos.localSlug,
        localNombre: datos.localNombre,
        proximo: datos.proximoPremio ? { nombre: datos.proximoPremio.nombre, puntos: datos.proximoPremio.puntosNecesarios } : null,
      },
      env.appUrl,
    );
    const jwt = jwtGuardar(cred, idObjeto(cred.issuerId, datos.serial), [env.appUrl]);
    return { url: urlGuardar(jwt) };
  },

  /** PATCH del objeto con los puntos nuevos. Sólo para tarjetas que pidieron el pase. */
  async notificarCambio(serial: string) {
    const cred = env.googleWallet;
    if (!cred) return;
    const datos = await datosTarjeta(serial, true);
    if (!datos) return;
    // 404: el objeto no existe en Google (no debería pasar: se crea al pedir el pase).
    await patchObjeto(cred, datos, env.appUrl);
  },
};
