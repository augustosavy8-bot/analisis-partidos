import { error, json } from "@/lib/app/servidor";
import { clavesDelChip, superadminDeRequest, UID_424 } from "@/lib/app/admin-chips";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Claves para grabar un chip (sólo viajan a la app del superadmin, por HTTPS, y no se guardan en el celular). */
export async function POST(req: Request) {
  if (!(await superadminDeRequest(req))) return error("Tu sesión de administrador venció. Volvé a entrar.", 401);
  const cuerpo = (await req.json().catch(() => null)) as { uid?: unknown } | null;
  const uid = typeof cuerpo?.uid === "string" ? cuerpo.uid.replace(/[\s:-]/g, "").toUpperCase() : "";
  if (!UID_424.test(uid)) return error("Este chip no parece un NTAG 424 DNA (UID de 7 bytes).", 400);
  let claves;
  try {
    claves = clavesDelChip(uid);
  } catch {
    return error("Faltan las claves de chips en el servidor (CHIPS_MASTER_KEY / NFC_SDM_META_KEY).", 500);
  }
  return json({
    uid,
    base: env.appUrl,
    k0: claves.k0.toString("hex").toUpperCase(),
    kMeta: claves.kMeta.toString("hex").toUpperCase(),
    kFile: claves.kFile.toString("hex").toUpperCase(),
  });
}
