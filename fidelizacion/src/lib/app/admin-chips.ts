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

/** Nivel de verificación del access token (aal1 = sólo contraseña, aal2 = con código). Ya validado por getUser. */
function nivelDelToken(token: string): string | null {
  try {
    return (JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as { aal?: string }).aal ?? null;
  } catch {
    return null;
  }
}

/** Superadmin dueño del token (access token de Supabase Auth, verificado en dos pasos) o null. */
export async function superadminDeRequest(req: Request): Promise<{ userId: string } | null> {
  const token = req.headers.get("authorization")?.match(/^Bearer\s+([A-Za-z0-9._-]{20,4000})$/)?.[1];
  if (!token) return null;
  const admin = crearClienteAdmin();
  const { data } = await admin.auth.getUser(token);
  if (!data.user || nivelDelToken(token) !== "aal2") return null;
  const { data: sa } = await admin.from("superadmins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  return sa ? { userId: data.user.id } : null;
}

export type ResultadoIngresoAdmin =
  | { ok: true; token: string; vence: number | null; email: string }
  | { ok: false; error: string; status: number };

/** Email, contraseña y código de la app autenticadora → access token aal2, sólo si es superadmin. */
export async function ingresarSuperadmin(email: string, password: string, codigo: string): Promise<ResultadoIngresoAdmin> {
  const anon = createClient(env.supabaseUrl, env.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  const fallo = { ok: false as const, error: "Email, contraseña o código incorrectos, o la cuenta no es de administrador.", status: 401 };
  if (error || !data.session) return fallo;
  const { data: sa } = await crearClienteAdmin().from("superadmins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!sa) return fallo;

  const { data: factores } = await anon.auth.mfa.listFactors();
  const factor = factores?.totp.find((f) => f.status === "verified");
  if (!factor) {
    return { ok: false, error: "Primero activá la verificación en dos pasos entrando al admin desde la web.", status: 403 };
  }
  if (!/^\d{6}$/.test(codigo)) return { ok: false, error: "Escribí el código de 6 números de tu app autenticadora.", status: 400 };
  const { data: verificado, error: errCodigo } = await anon.auth.mfa.challengeAndVerify({ factorId: factor.id, code: codigo });
  if (errCodigo || !verificado) return fallo;
  return { ok: true, token: verificado.access_token, vence: Math.floor(Date.now() / 1000) + verificado.expires_in, email: data.user.email ?? email };
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
