import { clienteDeRequest, detalleTarjeta, error } from "@/lib/app/servidor";
import { cabecerasPkpass, pkpassDeTarjeta } from "@/lib/wallet/pkpass-tarjeta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** El .pkpass de la tarjeta (el mismo que baja la web), para el botón nativo de la app. */
export async function GET(req: Request, { params }: RouteContext<"/api/app/v1/tarjetas/[slug]/apple-wallet">) {
  const cliente = await clienteDeRequest(req);
  if (!cliente) return error("Tu sesión venció. Volvé a entrar.", 401);
  const r = await detalleTarjeta(cliente.clienteId, (await params).slug);
  if (!r) return error("No encontramos esa tarjeta.", 404);
  try {
    const pase = await pkpassDeTarjeta(cliente, r.local);
    if (!pase) return error("Apple Wallet no está disponible por ahora.", 503);
    return new Response(new Uint8Array(pase), { headers: cabecerasPkpass(r.local.slug) });
  } catch (e) {
    console.error("App: no se pudo generar el pase", r.local.slug, e instanceof Error ? e.message : "error");
    return error("No pudimos crear tu pase. Probá de nuevo en un rato.", 502);
  }
}
