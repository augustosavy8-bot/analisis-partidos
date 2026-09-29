import { NextResponse, type NextRequest } from "next/server";
import { buscarLocal } from "@/lib/locales";
import { clienteActual } from "@/lib/sesion-cliente";
import { proveedorWallet } from "@/lib/wallet";
import { cabecerasPkpass, pkpassDeTarjeta } from "@/lib/wallet/pkpass-tarjeta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Agregar a Apple Wallet": el .pkpass de la tarjeta del cliente logueado (cookie
 * del celular) en este local. En Safari abre directo la hoja de "Agregar".
 */
export async function GET(req: NextRequest, { params }: RouteContext<"/t/[local]/apple-wallet">) {
  const { local: slug } = await params;
  const ir = (ruta: string) => NextResponse.redirect(new URL(ruta, req.url), 303);

  const apple = proveedorWallet("apple");
  const [local, cliente] = await Promise.all([buscarLocal(slug), clienteActual()]);
  if (!local) return ir("/aviso?m=local_inactivo");
  if (!apple || !cliente) return ir(`/t/${slug}`);

  try {
    const pase = await pkpassDeTarjeta(cliente, local);
    if (!pase) return ir(`/t/${slug}`);
    return new Response(new Uint8Array(pase), { headers: cabecerasPkpass(local.slug) });
  } catch (e) {
    // Sin datos sensibles: sólo el mensaje (nunca certificados, tokens ni datos del cliente).
    console.error("Apple Wallet: no se pudo generar el pase", slug, e instanceof Error ? e.message : "error");
    return ir("/aviso?m=wallet_error");
  }
}
