"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { contraseñaTemporal, requerirSuperadmin, slugDesde } from "@/lib/admin";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { cifrarClaveChip, descifrarClaveChip, esClaveChipValida } from "@/lib/cifrado";
import { generarSun } from "@/lib/sun";
import { hashToken } from "@/lib/dispositivo";
import { env } from "@/lib/env";
import { esTermino } from "@/lib/terminos";

const HEX = /^#[0-9a-f]{6}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Busca un usuario de Auth por email o lo crea con una contraseña temporal. */
async function usuarioPorEmail(email: string): Promise<{ id: string; password: string | null }> {
  const db = crearClienteAdmin();
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const u = data.users.find((x) => x.email?.toLowerCase() === email);
    if (u) return { id: u.id, password: null };
    if (data.users.length < 200) break;
  }
  const password = contraseñaTemporal();
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(error?.message ?? "No se pudo crear el usuario");
  return { id: data.user.id, password };
}

// --- Locales -----------------------------------------------------------------

export type EstadoLocal = {
  error?: string;
  creado?: { slug: string; nombre: string; email?: string; password?: string | null; errorDueno?: string };
};

export async function crearLocal(_prev: EstadoLocal, form: FormData): Promise<EstadoLocal> {
  await requerirSuperadmin();
  const nombre = String(form.get("nombre") ?? "").trim();
  const slug = slugDesde(String(form.get("slug") ?? "") || nombre);
  const rubro = String(form.get("rubro") ?? "").trim() || null;
  const primario = String(form.get("color_primario") ?? "#1f2937");
  const secundario = String(form.get("color_secundario") ?? "#f59e0b");
  const horas = Number(String(form.get("horas") ?? "4").replace(",", "."));
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const termino = String(form.get("termino_personal") ?? "mozo");

  if (nombre.length < 2 || nombre.length > 60) return { error: "Poné el nombre del local." };
  if (slug.length < 2) return { error: "La dirección (slug) no es válida." };
  if (!HEX.test(primario) || !HEX.test(secundario)) return { error: "Colores inválidos." };
  if (!Number.isFinite(horas) || horas < 0 || horas > 168) return { error: "La regla va de 0 a 168 horas." };
  if (email && !EMAIL.test(email)) return { error: "El email del dueño no es válido." };
  if (!esTermino(termino)) return { error: "Elegí cómo se llama su personal." };

  const db = crearClienteAdmin();
  const { data: existe } = await db.from("locales").select("id").eq("slug", slug).maybeSingle();
  if (existe) return { error: `Ya existe un local con la dirección /${slug}. Elegí otra.` };

  const { data: local, error } = await db
    .from("locales")
    .insert({
      nombre,
      slug,
      rubro,
      color_primario: primario.toLowerCase(),
      color_secundario: secundario.toLowerCase(),
      minutos_entre_puntos: Math.round(horas * 60),
      termino_personal: termino,
    })
    .select("id, slug")
    .single();
  if (error || !local) return { error: "No se pudo crear el local." };

  const creado: NonNullable<EstadoLocal["creado"]> = { slug: local.slug, nombre };
  if (email) {
    creado.email = email;
    try {
      const u = await usuarioPorEmail(email);
      await db.from("miembros_local").upsert({ user_id: u.id, local_id: local.id, rol: "dueno" });
      creado.password = u.password;
    } catch (e) {
      creado.errorDueno = e instanceof Error ? e.message : "error";
    }
  }
  return { creado };
}

export async function alternarLocal(slug: string, activo: boolean) {
  await requerirSuperadmin();
  await crearClienteAdmin().from("locales").update({ activo }).eq("slug", slug);
  refresh();
}

// --- Dueños ------------------------------------------------------------------

export type EstadoDueno = { error?: string; email?: string; password?: string | null; ok?: number };

export async function agregarDueno(localId: string, _prev: EstadoDueno, form: FormData): Promise<EstadoDueno> {
  await requerirSuperadmin();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return { error: "Email inválido." };
  try {
    const u = await usuarioPorEmail(email);
    const { error } = await crearClienteAdmin().from("miembros_local").upsert({ user_id: u.id, local_id: localId, rol: "dueno" });
    if (error) return { error: "No se pudo asignar." };
    refresh();
    return { ok: Date.now(), email, password: u.password };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" };
  }
}

export async function quitarDueno(localId: string, userId: string) {
  await requerirSuperadmin();
  await crearClienteAdmin().from("miembros_local").delete().eq("local_id", localId).eq("user_id", userId);
  refresh();
}

/** Genera una contraseña temporal nueva para un dueño (para cuando se la olvida). */
export async function nuevaContraseña(userId: string): Promise<{ password?: string; error?: string }> {
  await requerirSuperadmin();
  const password = contraseñaTemporal();
  const { error } = await crearClienteAdmin().auth.admin.updateUserById(userId, { password });
  if (error) return { error: error.message };
  return { password };
}

// --- Chips -------------------------------------------------------------------

export type EstadoChip = { error?: string; ok?: number; urlPrueba?: string };

function normalizarUid(uid: string) {
  return uid.replace(/[\s:-]/g, "").toUpperCase();
}

export async function crearChip(localId: string, _prev: EstadoChip, form: FormData): Promise<EstadoChip> {
  await requerirSuperadmin();
  const uid = normalizarUid(String(form.get("uid") ?? ""));
  const etiqueta = String(form.get("etiqueta") ?? "").trim() || null;
  const mozoId = String(form.get("mozo") ?? "") || null;
  const modo = form.get("modo") === "produccion" ? "produccion" : "prueba";
  const clave = String(form.get("clave") ?? "").replace(/\s/g, "");

  if (!/^[0-9A-F]{8,20}$/.test(uid)) return { error: "El UID tiene que ser hexadecimal (ej: 04A1B2C3D4E5F6)." };
  if (etiqueta && etiqueta.length > 40) return { error: "La etiqueta es muy larga." };

  const datos: Record<string, unknown> = { uid, etiqueta, mozo_id: mozoId, local_id: localId, modo };
  let urlPrueba: string | undefined;
  if (modo === "produccion") {
    if (!esClaveChipValida(clave)) return { error: "La clave AES-128 tiene que tener 32 caracteres hexadecimales." };
    try {
      datos.clave_aes_cifrada = cifrarClaveChip(clave, env.chipsMasterKey);
    } catch {
      return { error: "Falta configurar CHIPS_MASTER_KEY en el servidor." };
    }
  } else {
    const token = randomBytes(18).toString("base64url");
    datos.token_prueba_hash = hashToken(token);
    urlPrueba = `${env.appUrl}/n?t=${token}`;
  }

  const { error } = await crearClienteAdmin().from("chips").insert(datos);
  if (error) {
    return { error: error.code === "23505" ? "Ya existe un chip con ese UID." : "No se pudo crear el chip." };
  }
  refresh();
  return { ok: Date.now(), urlPrueba };
}

export async function alternarChip(chipId: string, activo: boolean) {
  await requerirSuperadmin();
  await crearClienteAdmin().from("chips").update({ activo }).eq("id", chipId);
  refresh();
}

export async function asignarMozo(chipId: string, mozoId: string | null) {
  await requerirSuperadmin();
  await crearClienteAdmin().from("chips").update({ mozo_id: mozoId }).eq("id", chipId);
  refresh();
}

/** Chips de prueba: genera un token nuevo (el anterior deja de funcionar). */
export async function regenerarTokenChip(chipId: string): Promise<{ urlPrueba?: string }> {
  await requerirSuperadmin();
  const token = randomBytes(18).toString("base64url");
  const { error } = await crearClienteAdmin()
    .from("chips")
    .update({ token_prueba_hash: hashToken(token) })
    .eq("id", chipId)
    .eq("modo", "prueba");
  if (error) return {};
  return { urlPrueba: `${env.appUrl}/n?t=${token}` };
}

export async function borrarChip(chipId: string) {
  await requerirSuperadmin();
  await crearClienteAdmin().from("chips").delete().eq("id", chipId);
  refresh();
}

/**
 * Chips de producción: genera la URL que produciría el chip en su próxima lectura
 * (contador = último + 1), para probar el flujo SUN sin tener el chip a mano.
 * Abrirla consume ese contador, igual que un toque real.
 */
export async function simularToqueSun(chipId: string): Promise<{ url?: string; error?: string }> {
  await requerirSuperadmin();
  const { data: chip } = await crearClienteAdmin()
    .from("chips")
    .select("uid, modo, clave_aes_cifrada, ultimo_contador")
    .eq("id", chipId)
    .maybeSingle();
  if (!chip || chip.modo !== "produccion" || !chip.clave_aes_cifrada) return { error: "Sólo para chips de producción." };
  try {
    const clave = descifrarClaveChip(chip.clave_aes_cifrada, env.chipsMasterKey);
    const { p, m } = generarSun(chip.uid, chip.ultimo_contador + 1, env.sdmMetaKey, clave);
    return { url: `${env.appUrl}/n?p=${p}&m=${m}` };
  } catch {
    return { error: "Faltan NFC_SDM_META_KEY o CHIPS_MASTER_KEY en el servidor, o el UID no es de 7 bytes." };
  }
}
