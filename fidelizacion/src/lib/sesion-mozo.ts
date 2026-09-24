import "server-only";
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

export type SesionMozo = { mozoId: string; nombre: string; localId: string; localSlug: string; exp: number };

export async function mozoActual(slug?: string): Promise<SesionMozo | null> {
  const store = await cookies();
  const s = verificarFirma<SesionMozo>(store.get(COOKIE_MOZO)?.value, env.hmacSecret);
  if (!s || (slug && s.localSlug !== slug)) return null;
  // El mozo pudo haber sido desactivado durante el turno.
  const { data } = await crearClienteAdmin().from("mozos").select("activo").eq("id", s.mozoId).maybeSingle();
  return data?.activo ? s : null;
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

  const desde = new Date(Date.now() - VENTANA_FALLOS_MIN * 60_000).toISOString();
  const { count } = await db
    .from("intentos_pin")
    .select("id", { count: "exact", head: true })
    .eq("mozo_id", mozo.id)
    .eq("exitoso", false)
    .gt("created_at", desde);
  if ((count ?? 0) >= MAX_FALLOS) {
    return { ok: false, error: `Demasiados intentos. Esperá ${VENTANA_FALLOS_MIN} minutos o pedile ayuda al encargado.` };
  }

  const ok = verificarPin(pin, mozo.pin_hash);
  await db.from("intentos_pin").insert({ mozo_id: mozo.id, exitoso: ok });
  if (!ok) {
    const quedan = MAX_FALLOS - (count ?? 0) - 1;
    return { ok: false, error: quedan > 0 ? `PIN incorrecto. Te quedan ${quedan} intentos.` : "PIN incorrecto." };
  }

  const sesion: SesionMozo = {
    mozoId: mozo.id,
    nombre: mozo.nombre,
    localId: local.id,
    localSlug: local.slug,
    exp: Math.floor(Date.now() / 1000) + DURACION_TURNO,
  };
  (await cookies()).set(COOKIE_MOZO, firmar(sesion, env.hmacSecret), opcionesCookie(DURACION_TURNO));
  return { ok: true };
}

export async function salirMozo() {
  (await cookies()).delete(COOKIE_MOZO);
}
