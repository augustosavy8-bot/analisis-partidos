import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";

/** Para opinar hace falta haber usado Point un poco: 2 semanas desde el alta del local. */
const DIAS_MINIMOS = 14;

/**
 * Locales donde se prueba el cartel: ahí aparece sin esperar las 2 semanas y también
 * para el superadmin. Vacío = todos los locales con las reglas normales.
 */
export const LOCALES_EN_PRUEBA: string[] = [];
const enPrueba = (slug: string) => LOCALES_EN_PRUEBA.includes(slug);

const haceDias = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

/** ¿Puede opinar? Dueño o encargado del local (el superadmin que entra a mirar, sólo en prueba). */
export async function puedeOpinar(localId: string, slug: string, userId: string): Promise<boolean> {
  if (LOCALES_EN_PRUEBA.length && !enPrueba(slug)) return false;
  if (enPrueba(slug)) return true;
  const { data } = await crearClienteAdmin().from("miembros_local").select("user_id").eq("local_id", localId).eq("user_id", userId).maybeSingle();
  return !!data;
}

/**
 * ¿Le mostramos el cartel de opinión a este dueño en este local? Se pregunta una
 * sola vez: si ya contestó, no vuelve; si lo cerró sin contestar, vuelve a aparecer.
 */
export async function corresponderOpinion(localId: string, slug: string, userId: string): Promise<boolean> {
  if (!(await puedeOpinar(localId, slug, userId))) return false;
  const db = crearClienteAdmin();
  const [{ data: local }, { count: respondidas }] = await Promise.all([
    db.from("locales").select("created_at").eq("id", localId).maybeSingle(),
    db.from("opiniones").select("id", { count: "exact", head: true }).eq("local_id", localId).eq("user_id", userId).not("estrellas", "is", null),
  ]);
  if (!local || (respondidas ?? 0) > 0) return false;
  return enPrueba(slug) || local.created_at <= haceDias(DIAS_MINIMOS);
}
