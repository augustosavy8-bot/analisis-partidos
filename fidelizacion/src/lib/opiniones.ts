import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";

/** Para opinar hace falta haber usado Point un tiempo. */
const DIAS_MINIMOS = 14;
const SUMAS_MINIMAS = 20;
/** Después de opinar, se vuelve a preguntar a los 90 días; si cerró el cartel, a los 30. */
const DIAS_TRAS_OPINAR = 90;
const DIAS_TRAS_CERRAR = 30;

const haceDias = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

/** ¿Es dueño o encargado del local? (el superadmin que entra a mirar no opina). */
export async function esMiembro(localId: string, userId: string): Promise<boolean> {
  const { data } = await crearClienteAdmin().from("miembros_local").select("user_id").eq("local_id", localId).eq("user_id", userId).maybeSingle();
  return !!data;
}

/** ¿Le mostramos el cartel de opinión a este dueño en este local? */
export async function corresponderOpinion(localId: string, userId: string): Promise<boolean> {
  const db = crearClienteAdmin();
  const [miembro, { data: local }, { data: ultima }, { count: sumas }] = await Promise.all([
    esMiembro(localId, userId),
    db.from("locales").select("created_at").eq("id", localId).maybeSingle(),
    db.from("opiniones").select("estrellas, created_at").eq("local_id", localId).eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("movimientos").select("id", { count: "exact", head: true }).eq("local_id", localId).eq("tipo", "suma"),
  ]);
  if (!miembro || !local || local.created_at > haceDias(DIAS_MINIMOS) || (sumas ?? 0) < SUMAS_MINIMAS) return false;
  if (!ultima) return true;
  return ultima.created_at < haceDias(ultima.estrellas ? DIAS_TRAS_OPINAR : DIAS_TRAS_CERRAR);
}
