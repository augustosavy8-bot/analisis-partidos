import { NextResponse, type NextRequest } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";
import { aCSV } from "@/lib/csv";

export const dynamic = "force-dynamic";

/** Exporta los clientes del local a CSV (respeta RLS: sólo dueños del local). */
export async function GET(req: NextRequest, { params }: RouteContext<"/panel/[local]/clientes/csv">) {
  const { local: slug } = await params;
  const db = await crearClienteServidor();
  const { data: claims } = await db.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.redirect(new URL("/panel/ingresar", req.url));

  const { data: local } = await db.from("locales").select("id, slug, zona_horaria").eq("slug", slug).maybeSingle();
  if (!local) return new NextResponse("No encontrado", { status: 404 });

  const q = req.nextUrl.searchParams.get("q")?.slice(0, 60) || null;
  const { data, error } = await db.rpc("panel_clientes", { p_local_id: local.id, p_busqueda: q, p_limite: 10000 });
  if (error) return new NextResponse("Error", { status: 500 });

  const fmt = (iso: string | null) =>
    iso
      ? new Intl.DateTimeFormat("es-AR", {
          timeZone: local.zona_horaria,
          dateStyle: "short",
          timeStyle: "short",
          hourCycle: "h23",
        }).format(new Date(iso))
      : "";

  type Fila = {
    nombre: string; whatsapp: string; puntos: number; visitas: number; canjes: number;
    ultima_visita: string | null; alta: string; consentimiento_fecha: string;
  };
  const filas = (data ?? []) as Fila[];
  const csv = aCSV([
    ["Nombre", "WhatsApp", "Puntos", "Visitas", "Canjes", "Última visita", "Alta", "Consentimiento"],
    ...filas.map((c) => [c.nombre, c.whatsapp.replace("+", ""), c.puntos, c.visitas, c.canjes, fmt(c.ultima_visita), fmt(c.alta), fmt(c.consentimiento_fecha)]),
  ]);

  const hoy = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clientes-${local.slug}-${hoy}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
