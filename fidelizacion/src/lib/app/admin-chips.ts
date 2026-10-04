import "server-only";
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { cifrarClaveChip } from "@/lib/cifrado";
import { env } from "@/lib/env";
import { descifrarPICC, verificarMacSun } from "@/lib/sun";

/**
 * Grabar chips NTAG 424 DNA desde la app (sólo superadmin).
 *
 * Las claves de cada chip se derivan del UID con CHIPS_MASTER_KEY: así, si una grabación
 * se corta a la mitad, el servidor puede volver a dar las mismas y la app retoma.
 *   Key 0 (maestra)      = HMAC(maestra, "point-chip-k0:" + UID)
 *   Key 1 (SDMMetaRead)  = NFC_SDM_META_KEY (común)
 *   Key 2 (SDMFileRead)  = HMAC(maestra, "point-chip-sdm-file:" + UID)
 */

export const UID_424 = /^[0-9A-F]{14}$/;

function derivar(etiqueta: string, uid: string): Buffer {
  return createHmac("sha256", Buffer.from(env.chipsMasterKey, "hex")).update(`${etiqueta}:${uid}`).digest().subarray(0, 16);
}

export function clavesDelChip(uid: string) {
  return { k0: derivar("point-chip-k0", uid), kMeta: env.sdmMetaKey, kFile: derivar("point-chip-sdm-file", uid) };
}

/** Superadmin dueño del token (access token de Supabase Auth) o null. */
export async function superadminDeRequest(req: Request): Promise<{ userId: string } | null> {
  const token = req.headers.get("authorization")?.match(/^Bearer\s+([A-Za-z0-9._-]{20,4000})$/)?.[1];
  if (!token) return null;
  const admin = crearClienteAdmin();
  const { data } = await admin.auth.getUser(token);
  if (!data.user) return null;
  const { data: sa } = await admin.from("superadmins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  return sa ? { userId: data.user.id } : null;
}

/** Email y contraseña de Supabase Auth → access token, sólo si es superadmin. */
export async function ingresarSuperadmin(email: string, password: string) {
  const anon = createClient(env.supabaseUrl, env.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session) return null;
  const { data: sa } = await crearClienteAdmin().from("superadmins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!sa) return null;
  return { token: data.session.access_token, vence: data.session.expires_at ?? null, email: data.user.email ?? email };
}

export type AltaChip = { uid: string; p: string; m: string; localId: string; mozoId: string | null; etiqueta: string | null };

/**
 * Verifica una lectura real del chip recién grabado (como cualquier toque) y lo da de alta
 * (o lo pasa a producción si ya existía con ese UID).
 */
export async function registrarChipGrabado(d: AltaChip): Promise<{ ok: true; chipId: string } | { ok: false; error: string }> {
  const { kMeta, kFile } = clavesDelChip(d.uid);
  const picc = descifrarPICC(d.p, kMeta);
  if (!picc || picc.uid !== d.uid) return { ok: false, error: "El chip no cifró bien su identificador. Probá grabarlo de nuevo." };
  if (!verificarMacSun(kFile, picc, d.m)) return { ok: false, error: "La firma del chip no coincide. Probá grabarlo de nuevo." };

  const admin = crearClienteAdmin();
  const { data: local } = await admin.from("locales").select("id").eq("id", d.localId).maybeSingle();
  if (!local) return { ok: false, error: "Ese local no existe." };
  if (d.mozoId) {
    const { data: mozo } = await admin.from("mozos").select("id").eq("id", d.mozoId).eq("local_id", d.localId).maybeSingle();
    if (!mozo) return { ok: false, error: "Esa persona no es de ese local." };
  }

  const fila = {
    uid: d.uid,
    local_id: d.localId,
    mozo_id: d.mozoId,
    etiqueta: d.etiqueta,
    modo: "produccion",
    clave_aes_cifrada: cifrarClaveChip(kFile.toString("hex"), env.chipsMasterKey),
    token_prueba_hash: null,
    ultimo_contador: picc.contador,
    activo: true,
  };
  const { data, error } = await admin.from("chips").upsert(fila, { onConflict: "uid" }).select("id").single();
  if (error || !data) return { ok: false, error: "No se pudo guardar el chip." };
  return { ok: true, chipId: data.id };
}
