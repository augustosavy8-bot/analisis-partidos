import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { firmar, verificarFirma } from "@/lib/firmas";
import { env } from "@/lib/env";
import { opcionesCookie } from "@/lib/dispositivo";
import { verificarPin } from "@/lib/pin";

export const COOKIE_MOZO = "fid_mozo";
const DURACION_TURNO = 12 * 60 * 60;
const MAX_FALLOS = 5;
const VENTANA_FALLOS_MIN = 15;

/** `pv`: huella del PIN con el que se entró; si el encargado cambia el PIN, la sesión se cae. */
export type SesionMozo = { mozoId: string; nombre: string; localId: string; localSlug: string; pv: string; exp: number };

const huellaPin = (pinHash: string) => createHash("sha256").update(pinHash).digest("base64url").slice(0, 16);

export async function mozoActual(slug?: string): Promise<SesionMozo | null> {
  const store = await cookies();
  const s = verificarFirma<SesionMozo>("mozo", store.get(COOKIE_MOZO)?.value, env.hmacSecret);
  if (!s || (slug && s.localSlug !== slug)) return null;
  // El mozo pudo haber sido desactivado (o cambiado su PIN) durante el turno.
  const { data } = await crearClienteAdmin().from("mozos").select("activo, pin_hash").eq("id", s.mozoId).maybeSingle();
  return data?.activo && data.pin_hash && huellaPin(data.pin_hash) === s.pv ? s : null;
}

export async function ingresarMozo(
  mozoId: string,
  pin: string,
  local: { id: string; slug: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = crearClienteAdmin();
  const { data: mozo } = await db
    .from("mozos")
    .select("id, nombre, pin_hash, activo")
    .eq("id", mozoId)
    .eq("local_id", local.id)
    .maybeSingle();
  if (!mozo?.activo || !mozo.pin_hash) return { ok: false, error: "Ese mozo no puede usar el QR." };

  // Atómico: la base cuenta los fallos y anota este intento como fallido ANTES de
  // verificar el PIN, así muchos intentos en paralelo no pasan todos el límite.
  const { data: intento, error: errIntento } = await db.rpc("reservar_intento_pin", {
    p_mozo_id: mozo.id,
    p_max_fallos: MAX_FALLOS,
    p_ventana_min: VENTANA_FALLOS_MIN,
  });
  if (errIntento) return { ok: false, error: "No pudimos verificar el PIN. Probá de nuevo." };
  const r = intento as { id: number | null; fallos: number };
  if (r.id === null) {
    return { ok: false, error: `Demasiados intentos. Esperá ${VENTANA_FALLOS_MIN} minutos o pedile ayuda al encargado.` };
  }

  const ok = verificarPin(pin, mozo.pin_hash);
  if (!ok) {
    const quedan = MAX_FALLOS - r.fallos;
    return { ok: false, error: quedan > 0 ? `PIN incorrecto. Te quedan ${quedan} intentos.` : "PIN incorrecto." };
  }
  await db.from("intentos_pin").update({ exitoso: true }).eq("id", r.id);

  const sesion: SesionMozo = {
    mozoId: mozo.id,
    nombre: mozo.nombre,
    localId: local.id,
    localSlug: local.slug,
    pv: huellaPin(mozo.pin_hash),
    exp: Math.floor(Date.now() / 1000) + DURACION_TURNO,
  };
  (await cookies()).set(COOKIE_MOZO, firmar("mozo", sesion, env.hmacSecret), opcionesCookie(DURACION_TURNO));
  return { ok: true };
}

export async function salirMozo() {
  (await cookies()).delete(COOKIE_MOZO);
}
