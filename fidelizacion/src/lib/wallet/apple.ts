import "server-only";
import { randomBytes } from "node:crypto";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import type { Local } from "@/lib/locales";
import { imagenIcono, imagenLogoPase, imagenStripPase } from "@/lib/imagenes-billetera";
import type { DatosPase, ProveedorWallet } from "./index";
import { armarPassJson, enviarPushes, firmarPkpass, type ImagenesPase } from "./apple-core";
import { ultimoMovimiento } from "./movimiento";

/** ¿Hay credenciales válidas de Apple Wallet? Sin ellas, todo esto no hace nada. */
export function appleWalletActivo() {
  return env.appleWallet !== null;
}

// --- Imágenes (cacheadas en memoria por diseño del local) ------------------------

const cacheImagenes = new Map<string, Promise<ImagenesPase>>();

async function png(r: Response) {
  return Buffer.from(await r.arrayBuffer());
}

function imagenesDelLocal(local: Local): Promise<ImagenesPase> {
  const clave = [local.id, local.nombre, local.logo_url, local.icono_url, local.franja_url, local.color_primario, local.color_secundario].join("|");
  let p = cacheImagenes.get(clave);
  if (!p) {
    p = (async () => {
      const [icon, icon2, icon3, logo, logo2, logo3, strip, strip2, strip3] = await Promise.all([
        imagenIcono(local, 29).then(png),
        imagenIcono(local, 58).then(png),
        imagenIcono(local, 87).then(png),
        imagenLogoPase(local, 1).then(png),
        imagenLogoPase(local, 2).then(png),
        imagenLogoPase(local, 3).then(png),
        imagenStripPase(local, 1).then(png),
        imagenStripPase(local, 2).then(png),
        imagenStripPase(local, 3).then(png),
      ]);
      return {
        "icon.png": icon,
        "icon@2x.png": icon2,
        "icon@3x.png": icon3,
        "logo.png": logo,
        "logo@2x.png": logo2,
        "logo@3x.png": logo3,
        "strip.png": strip,
        "strip@2x.png": strip2,
        "strip@3x.png": strip3,
      };
    })();
    p.catch(() => cacheImagenes.delete(clave));
    if (cacheImagenes.size > 50) cacheImagenes.delete(cacheImagenes.keys().next().value!);
    cacheImagenes.set(clave, p);
  }
  return p;
}

// --- Pases ----------------------------------------------------------------------

type FilaPase = { serial: string; tarjeta_id: string; local_id: string; auth_token: string; updated_at: string };

/** Crea el registro del pase (con su authenticationToken) si todavía no existe. */
async function asegurarPaseApple(t: { serial: string; tarjetaId: string; clienteId: string; localId: string }): Promise<FilaPase> {
  const db = crearClienteAdmin();
  const { data: existe } = await db.from("apple_passes").select("serial, tarjeta_id, local_id, auth_token, updated_at").eq("serial", t.serial).maybeSingle();
  if (existe) return existe;
  const { data, error } = await db
    .from("apple_passes")
    .upsert(
      { serial: t.serial, tarjeta_id: t.tarjetaId, cliente_id: t.clienteId, local_id: t.localId, auth_token: randomBytes(24).toString("hex") },
      { onConflict: "serial", ignoreDuplicates: true },
    )
    .select("serial, tarjeta_id, local_id, auth_token, updated_at")
    .maybeSingle();
  if (data) return data;
  // Carrera: otra request lo creó entre el select y el upsert.
  const { data: otra } = await db.from("apple_passes").select("serial, tarjeta_id, local_id, auth_token, updated_at").eq("serial", t.serial).maybeSingle();
  if (!otra) throw new Error(`No se pudo crear el pase de Apple (${error?.code ?? "sin código"})`);
  return otra;
}

export async function paseApple(serial: string): Promise<FilaPase | null> {
  if (!/^[0-9a-f]{32}$/.test(serial)) return null;
  const { data } = await crearClienteAdmin()
    .from("apple_passes")
    .select("serial, tarjeta_id, local_id, auth_token, updated_at")
    .eq("serial", serial)
    .maybeSingle();
  return data;
}

/** Arma y firma el .pkpass de un pase con los datos actuales de la tarjeta y del local. */
export async function generarPkpass(pase: FilaPase): Promise<Buffer> {
  const cred = env.appleWallet;
  if (!cred) throw new Error("Apple Wallet no está configurado");
  const db = crearClienteAdmin();
  const [{ data: tarjeta }, { data: premios }, { data: novedad }, ultimo] = await Promise.all([
    db
      .from("tarjetas")
      .select(
        "serial, wallet_auth_token, puntos, clientes(nombre), " +
          "locales(id, slug, nombre, rubro, logo_url, icono_url, color_primario, color_secundario, color_texto, color_etiqueta, franja_url, nombre_programa, texto_dorso, minutos_entre_puntos, zona_horaria, termino_personal, puntos_bienvenida, puntos_cumple, latitud, longitud)",
      )
      .eq("id", pase.tarjeta_id)
      .maybeSingle(),
    db.from("premios").select("nombre, puntos_necesarios").eq("local_id", pase.local_id).eq("activo", true).order("puntos_necesarios"),
    db
      .from("mensajes_local")
      .select("titulo, texto")
      .eq("local_id", pase.local_id)
      .neq("estado", "error")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    ultimoMovimiento(pase.tarjeta_id),
  ]);
  const t = tarjeta as unknown as {
    serial: string;
    wallet_auth_token: string;
    puntos: number;
    clientes: { nombre: string } | null;
    locales: Local | null;
  } | null;
  if (!t?.locales) throw new Error("La tarjeta del pase no existe");
  const local = t.locales;
  const base = env.appUrl;

  const passJson = armarPassJson(
    cred,
    {
      serial: pase.serial,
      authToken: pase.auth_token,
      puntos: t.puntos,
      clienteNombre: t.clientes?.nombre ?? "",
      urlPase: `${base}/w/${t.serial}/${t.wallet_auth_token}`,
      urlTarjeta: `${base}/t/${local.slug}`,
      ultimoMovimiento: ultimo,
      novedad,
      local: {
        nombre: local.nombre,
        colorPrimario: local.color_primario,
        colorSecundario: local.color_secundario,
        colorTexto: local.color_texto,
        colorEtiqueta: local.color_etiqueta,
        nombrePrograma: local.nombre_programa,
        textoDorso: local.texto_dorso,
        premios: (premios ?? []).map((p) => ({ nombre: p.nombre, puntos: p.puntos_necesarios })),
        latitud: local.latitud,
        longitud: local.longitud,
      },
    },
    base,
  );
  return firmarPkpass(cred, passJson, await imagenesDelLocal(local));
}

// --- Actualizaciones + push -----------------------------------------------------

/**
 * Marca como actualizados los pases indicados y manda push (APNs) a todos los
 * dispositivos registrados. Si APNs responde 410, borra ese dispositivo.
 */
async function actualizarYAvisar(filtro: { serial: string } | { localId: string }): Promise<number> {
  const cred = env.appleWallet;
  if (!cred) return 0;
  const db = crearClienteAdmin();
  const consulta = db.from("apple_passes").update({ updated_at: new Date().toISOString() });
  const { data: pases } = await ("serial" in filtro ? consulta.eq("serial", filtro.serial) : consulta.eq("local_id", filtro.localId)).select("serial");
  const seriales = (pases ?? []).map((p) => p.serial);
  if (!seriales.length) return 0;

  const { data: regs } = await db
    .from("apple_registrations")
    .select("device_library_id, apple_devices(push_token)")
    .in("serial", seriales);
  const porToken = new Map<string, string>();
  for (const r of (regs ?? []) as unknown as { device_library_id: string; apple_devices: { push_token: string } | null }[]) {
    if (r.apple_devices?.push_token) porToken.set(r.apple_devices.push_token, r.device_library_id);
  }
  if (!porToken.size) return seriales.length;

  const resultados = await enviarPushes(cred, [...porToken.keys()]);
  const bajas = resultados.filter((r) => r.status === 410).map((r) => porToken.get(r.token)!);
  if (bajas.length) await db.from("apple_devices").delete().in("device_library_id", bajas);
  const fallidos = resultados.filter((r) => r.status !== 200 && r.status !== 410).length;
  if (fallidos) console.error(`Apple Wallet: ${fallidos} de ${resultados.length} push fallaron (status ${[...new Set(resultados.map((r) => r.status))].join(", ")})`);
  return seriales.length;
}

/** Cambió el local o sus premios: actualiza todos sus pases de Apple. Nunca lanza. */
export async function notificarCambioLocalApple(localId: string) {
  try {
    await actualizarYAvisar({ localId });
  } catch (e) {
    console.error("Apple Wallet: no se pudo avisar el cambio del local", localId, e instanceof Error ? e.message : e);
  }
}

/**
 * El local mandó un mensaje: actualiza sus pases (el campo Novedades cambia) y
 * manda push; iOS muestra el mensaje por el changeMessage. Devuelve cuántos pases
 * se actualizaron. Nunca lanza.
 */
export async function notificarMensajeApple(localId: string): Promise<number> {
  try {
    return await actualizarYAvisar({ localId });
  } catch (e) {
    console.error("Apple Wallet: no se pudo avisar el mensaje del local", localId, e instanceof Error ? e.message : e);
    return 0;
  }
}

export const proveedorApple: ProveedorWallet = {
  plataforma: "apple",

  /** Devuelve el .pkpass firmado (crea el pase si no existía). */
  async generarPase(datos: DatosPase) {
    if (!datos.tarjetaId || !datos.clienteId || !datos.localId) throw new Error("Faltan datos de la tarjeta");
    const pase = await asegurarPaseApple({ serial: datos.serial, tarjetaId: datos.tarjetaId, clienteId: datos.clienteId, localId: datos.localId });
    return { archivo: new Uint8Array(await generarPkpass(pase)) };
  },

  /** Suma, canje o regalo: updated_at del pase + push a sus dispositivos. */
  async notificarCambio(serial: string) {
    await actualizarYAvisar({ serial });
  },
};
