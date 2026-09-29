import { buscarLocal } from "@/lib/locales";
import { imagenIcono } from "@/lib/imagenes-billetera";

/** Ícono del local (PWA, Google Wallet y vista previa del panel): ícono subido, logo o inicial. */
export async function GET(req: Request, { params }: RouteContext<"/t/[local]/icono">) {
  const { local: slug } = await params;
  const local = await buscarLocal(slug);
  if (!local) return new Response("No existe", { status: 404 });

  const pedido = Number(new URL(req.url).searchParams.get("s")) || 192;
  // Hasta 660: el logo cuadrado que recomienda Google Wallet.
  const s = Math.min(660, Math.max(64, Math.round(pedido)));
  return imagenIcono(local, s, { "Cache-Control": "public, max-age=86400" });
}
