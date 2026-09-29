import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { proximoPremio } from "@/lib/tarjeta";
import type { DatosPase, ProveedorWallet } from "./index";
import {
  agregarMensaje,
  hashCorto,
  idObjeto,
  jwtGuardar,
  patchObjeto,
  upsertClase,
  upsertObjeto,
  urlGuardar,
  type MensajeGoogle,
  type TarjetaGoogle,
} from "./google-core";
import { ultimoMovimiento } from "./movimiento";

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
      db
        .from("locales")
        .select("slug, nombre, logo_url, icono_url, color_primario, color_secundario, latitud, longitud, nombre_programa, texto_dorso, franja_url")
        .eq("id", localId)
        .maybeSingle(),
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
        ubicacion: local.latitud != null && local.longitud != null ? { latitud: local.latitud, longitud: local.longitud } : null,
        nombrePrograma: local.nombre_programa,
        textoDorso: local.texto_dorso,
        franjaUrl: local.franja_url,
        versionIcono: hashCorto([local.icono_url, local.logo_url, local.color_primario, local.color_secundario, local.nombre].join("|")),
      },
      env.appUrl,
    );
  } catch (e) {
    console.error("Google Wallet: no se pudo sincronizar la clase", localId, e);
  }
}

/** Datos del objeto a partir del serial (tarjeta, cliente, local y próximo premio). */
async function datosTarjeta(serial: string, soloRegistradas: boolean): Promise<(TarjetaGoogle & { tarjetaId: string }) | null> {
  const db = crearClienteAdmin();
  let consulta = db
    .from("tarjetas")
    .select(
      `id, local_id, serial, wallet_auth_token, puntos, clientes(nombre), locales(slug, nombre, franja_url)${soloRegistradas ? ", wallet_registros!inner(plataforma)" : ""}`,
    )
    .eq("serial", serial);
  if (soloRegistradas) consulta = consulta.eq("wallet_registros.plataforma", "google");
  const { data } = await consulta.limit(1).maybeSingle();
  if (!data) return null;
  const t = data as unknown as {
    id: string;
    local_id: string;
    serial: string;
    wallet_auth_token: string;
    puntos: number;
    clientes: { nombre: string } | null;
    locales: { slug: string; nombre: string; franja_url: string | null } | null;
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
    tarjetaId: t.id,
    serial: t.serial,
    token: t.wallet_auth_token,
    puntos: t.puntos,
    clienteNombre: t.clientes?.nombre ?? "",
    localSlug: t.locales.slug,
    localNombre: t.locales.nombre,
    franjaUrl: t.locales.franja_url,
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
        franjaUrl: datos.franjaUrl,
        proximo: datos.proximoPremio ? { nombre: datos.proximoPremio.nombre, puntos: datos.proximoPremio.puntosNecesarios } : null,
      },
      env.appUrl,
    );
    const jwt = jwtGuardar(cred, idObjeto(cred.issuerId, datos.serial), [env.appUrl]);
    return { url: urlGuardar(jwt) };
  },

  /**
   * PATCH del objeto con los puntos nuevos. Sólo para tarjetas que pidieron el pase.
   * Si el cambio fue una suma (o un regalo), Google le avisa al cliente.
   */
  async notificarCambio(serial: string) {
    const cred = env.googleWallet;
    if (!cred) return;
    const datos = await datosTarjeta(serial, true);
    if (!datos) return;
    const avisar = (await ultimoMovimiento(datos.tarjetaId)) !== "canje";
    // 404: el objeto no existe en Google (no debería pasar: se crea al pedir el pase).
    await patchObjeto(cred, datos, env.appUrl, fetch, avisar);
  },
};

// --- Mensajes del local -----------------------------------------------------------

const EN_PARALELO = 8;

/**
 * Manda el mensaje (Add Message API, TEXT_AND_NOTIFY) a todos los pases de Google
 * del local. Devuelve cuántos llegaron y cuántos fallaron. Nunca lanza.
 */
export async function enviarMensajeGoogle(localId: string, m: MensajeGoogle): Promise<{ enviados: number; fallidos: number }> {
  const cred = env.googleWallet;
  if (!cred) return { enviados: 0, fallidos: 0 };
  const { data, error } = await crearClienteAdmin()
    .from("tarjetas")
    .select("serial, wallet_registros!inner(plataforma)")
    .eq("local_id", localId)
    .eq("wallet_registros.plataforma", "google");
  if (error) {
    console.error("Google Wallet: no se pudieron leer los pases del local", localId, error.message);
    return { enviados: 0, fallidos: 0 };
  }
  const seriales = [...new Set((data ?? []).map((t) => t.serial as string))];
  let enviados = 0;
  let fallidos = 0;
  for (let i = 0; i < seriales.length; i += EN_PARALELO) {
    const tanda = await Promise.allSettled(seriales.slice(i, i + EN_PARALELO).map((s) => agregarMensaje(cred, s, m)));
    for (const r of tanda) {
      if (r.status === "fulfilled" && r.value) enviados++;
      else if (r.status === "rejected") {
        fallidos++;
        if (fallidos <= 3) console.error("Google Wallet: addMessage falló", r.reason instanceof Error ? r.reason.message : r.reason);
      }
    }
  }
  return { enviados, fallidos };
}

/**
 * Cambió el diseño del local: PATCH de todos sus objetos (la franja va en el
 * objeto) sin notificar. La clase se actualiza aparte (sincronizarClaseLocal).
 */
export async function actualizarObjetosGoogleLocal(localId: string): Promise<number> {
  const cred = env.googleWallet;
  if (!cred) return 0;
  try {
    const { data } = await crearClienteAdmin()
      .from("tarjetas")
      .select("serial, wallet_registros!inner(plataforma)")
      .eq("local_id", localId)
      .eq("wallet_registros.plataforma", "google");
    const seriales = [...new Set((data ?? []).map((t) => t.serial as string))];
    let actualizados = 0;
    for (let i = 0; i < seriales.length; i += EN_PARALELO) {
      const tanda = await Promise.allSettled(
        seriales.slice(i, i + EN_PARALELO).map(async (s) => {
          const datos = await datosTarjeta(s, false);
          return datos ? patchObjeto(cred, datos, env.appUrl) : false;
        }),
      );
      actualizados += tanda.filter((r) => r.status === "fulfilled" && r.value).length;
    }
    return actualizados;
  } catch (e) {
    console.error("Google Wallet: no se pudieron actualizar los objetos del local", localId, e instanceof Error ? e.message : e);
    return 0;
  }
}
