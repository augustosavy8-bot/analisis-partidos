import { error, ingresoPermitido, json, registrarIntento } from "@/lib/app/servidor";
import { ingresarSuperadmin } from "@/lib/app/admin-chips";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ingreso del superadmin a la app (para grabar chips). Mismo límite de intentos por IP que el ingreso de clientes. */
export async function POST(req: Request) {
  if (!(await ingresoPermitido(req))) return error("Hiciste muchos intentos. Esperá unos minutos y probá de nuevo.", 429);
  const cuerpo = (await req.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  const email = typeof cuerpo?.email === "string" ? cuerpo.email.trim().toLowerCase() : "";
  const password = typeof cuerpo?.password === "string" ? cuerpo.password : "";
  if (!email || !password || email.length > 200 || password.length > 200) return error("Completá email y contraseña.", 400);

  const sesion = await ingresarSuperadmin(email, password);
  await registrarIntento(req, !!sesion);
  if (!sesion) return error("Email o contraseña incorrectos, o la cuenta no es de administrador.", 401);
  return json(sesion);
}
