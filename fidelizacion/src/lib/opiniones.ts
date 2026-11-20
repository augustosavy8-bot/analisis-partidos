import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";

/** Para opinar hace falta haber usado Point un tiempo. */
const DIAS_MINIMOS = 14;
const SUMAS_MINIMAS = 20;
/** Después de opinar, se vuelve a preguntar a los 90 días; si cerró el cartel, a los 30. */
const DIAS_TRAS_OPINAR = 90;
const DIAS_TRAS_CERRAR = 30;

/**
 * Mientras se prueba, el cartel sólo aparece en estos locales, sin esperar las 2
 * semanas ni las 20 visitas, y también para el superadmin. Vacío = todos los locales.
 */
export const LOCALES_EN_PRUEBA = ["mym"];
const enPrueba = (slug: string) => LOCALES_EN_PRUEBA.includes(slug);

const haceDias = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

/** ¿Puede opinar? Dueño o encargado del local (el superadmin que entra a mirar, sólo en prueba). */
export async function puedeOpinar(localId: string, slug: string, userId: string): Promise<boolean> {
  if (LOCALES_EN_PRUEBA.length && !enPrueba(slug)) return false;
  if (enPrueba(slug)) return true;
  return esMiembro(localId, userId);
}

async function esMiembro(localId: string, userId: string): Promise<boolean> {
  const { data } = await crearClienteAdmin().from("miembros_local").select("user_id").eq("local_id", localId).eq("user_id", userId).maybeSingle();
  return !!data;
}

/** ¿Le mostramos el cartel de opinión a este dueño en este local? */
export async function corresponderOpinion(localId: string, slug: string, userId: string): Promise<boolean> {
  if (!(await puedeOpinar(localId, slug, userId))) return false;
  const db = crearClienteAdmin();
  const [{ data: local }, { data: ultima }, { count: sumas }] = await Promise.all([
    db.from("locales").select("created_at").eq("id", localId).maybeSingle(),
    db.from("opiniones").select("estrellas, created_at").eq("local_id", localId).eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("movimientos").select("id", { count: "exact", head: true }).eq("local_id", localId).eq("tipo", "suma"),
  ]);
  if (!local) return false;
  if (!enPrueba(slug) && (local.created_at > haceDias(DIAS_MINIMOS) || (sumas ?? 0) < SUMAS_MINIMAS)) return false;
  if (!ultima) return true;
  return ultima.created_at < haceDias(ultima.estrellas ? DIAS_TRAS_OPINAR : DIAS_TRAS_CERRAR);
}
