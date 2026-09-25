import { buscarLocal } from "@/lib/locales";
import { imagenCabecera } from "@/lib/imagenes-billetera";

/** Cabecera del local para Google Wallet (1032×336). */
export async function GET(_req: Request, { params }: RouteContext<"/t/[local]/cabecera">) {
  const { local: slug } = await params;
  const local = await buscarLocal(slug);
  if (!local) return new Response("No existe", { status: 404 });
  return imagenCabecera(local);
}
