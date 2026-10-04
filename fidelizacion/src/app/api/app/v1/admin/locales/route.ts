import { error, json } from "@/lib/app/servidor";
import { superadminDeRequest } from "@/lib/app/admin-chips";
import { crearClienteAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Locales con su equipo, para elegir a dónde va el chip que se graba. */
export async function GET(req: Request) {
  if (!(await superadminDeRequest(req))) return error("Tu sesión de administrador venció. Volvé a entrar.", 401);
  const { data, error: e } = await crearClienteAdmin()
    .from("locales")
    .select("id, slug, nombre, activo, mozos(id, nombre, activo), chips(count)")
    .order("nombre");
  if (e) return error("No se pudieron leer los locales.", 500);
  return json({
    locales: (data ?? []).map((l) => ({
      id: l.id,
      slug: l.slug,
      nombre: l.nombre,
      activo: l.activo,
      chips: (l.chips as unknown as { count: number }[])[0]?.count ?? 0,
      equipo: (l.mozos ?? []).filter((m) => m.activo).map((m) => ({ id: m.id, nombre: m.nombre })),
    })),
  });
}
