import { clienteDeRequest, detalleTarjeta, error, json } from "@/lib/app/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Detalle de una tarjeta: puntos, próximo premio, premios, QR e historial. */
export async function GET(req: Request, { params }: RouteContext<"/api/app/v1/tarjetas/[slug]">) {
  const cliente = await clienteDeRequest(req);
  if (!cliente) return error("Tu sesión venció. Volvé a entrar.", 401);
  const r = await detalleTarjeta(cliente.clienteId, (await params).slug);
  if (!r) return error("No encontramos esa tarjeta.", 404);
  return json(r.detalle);
}
