import { error, json } from "@/lib/app/servidor";
import { registrarChipGrabado, superadminDeRequest, UID_424 } from "@/lib/app/admin-chips";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

/** Alta del chip recién grabado: el servidor verifica una lectura real (p, m) antes de guardarlo. */
export async function POST(req: Request) {
  if (!(await superadminDeRequest(req))) return error("Tu sesión de administrador venció. Volvé a entrar.", 401);
  const c = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const uid = typeof c?.uid === "string" ? c.uid.toUpperCase() : "";
  const p = typeof c?.p === "string" ? c.p : "";
  const m = typeof c?.m === "string" ? c.m : "";
  const localId = typeof c?.localId === "string" && UUID.test(c.localId) ? c.localId : "";
  const mozoId = typeof c?.mozoId === "string" && UUID.test(c.mozoId) ? c.mozoId : null;
  const etiqueta = typeof c?.etiqueta === "string" && c.etiqueta.trim() ? c.etiqueta.trim().slice(0, 40) : null;
  if (!UID_424.test(uid) || !p || !m || !localId) return error("Faltan datos del chip.", 400);

  const r = await registrarChipGrabado({ uid, p, m, localId, mozoId, etiqueta });
  if (!r.ok) return error(r.error, 422);
  return json(r);
}
