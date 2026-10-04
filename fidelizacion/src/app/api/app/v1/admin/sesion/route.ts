import { error, ingresoPermitido, json, registrarIntento } from "@/lib/app/servidor";
import { ingresarSuperadmin } from "@/lib/app/admin-chips";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ingreso del superadmin a la app (para grabar chips): contraseña + código de dos pasos. Mismo límite de intentos por IP que el ingreso de clientes. */
export async function POST(req: Request) {
  if (!(await ingresoPermitido(req))) return error("Hiciste muchos intentos. Esperá unos minutos y probá de nuevo.", 429);
  const cuerpo = (await req.json().catch(() => null)) as { email?: unknown; password?: unknown; codigo?: unknown } | null;
  const email = typeof cuerpo?.email === "string" ? cuerpo.email.trim().toLowerCase() : "";
  const password = typeof cuerpo?.password === "string" ? cuerpo.password : "";
  if (!email || !password || email.length > 200 || password.length > 200) return error("Completá email y contraseña.", 400);

  const codigo = typeof cuerpo?.codigo === "string" ? cuerpo.codigo.replace(/\D/g, "") : "";
  const r = await ingresarSuperadmin(email, password, codigo);
  await registrarIntento(req, r.ok);
  if (!r.ok) return error(r.error, r.status);
  return json({ token: r.token, vence: r.vence, email: r.email });
}
