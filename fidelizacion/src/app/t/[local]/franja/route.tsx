import { buscarLocal } from "@/lib/locales";
import { premiosDelLocal } from "@/lib/tarjeta";
import { imagenFranja } from "@/lib/imagenes-billetera";

/**
 * Franja de la billetera del local: /t/<local>/franja?p=7 (sellos llenos) y ?m=10 (total).
 * Sin datos personales. Por defecto el total es el primer premio.
 */
export async function GET(req: Request, { params }: RouteContext<"/t/[local]/franja">) {
  const { local: slug } = await params;
  const local = await buscarLocal(slug);
  if (!local) return new Response("No existe", { status: 404 });

  const sp = new URL(req.url).searchParams;
  const premios = await premiosDelLocal(local.id);
  const metaPedida = Number(sp.get("m"));
  const meta = Number.isInteger(metaPedida) && metaPedida > 0 ? metaPedida : (premios[0]?.puntos_necesarios ?? 10);
  const puntos = Math.max(0, Math.min(999, Math.floor(Number(sp.get("p")) || 0)));
  return imagenFranja(local, puntos, meta);
}
