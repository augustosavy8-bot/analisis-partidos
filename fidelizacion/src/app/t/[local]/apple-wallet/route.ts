import { NextResponse, type NextRequest } from "next/server";
import { buscarLocal } from "@/lib/locales";
import { clienteActual } from "@/lib/sesion-cliente";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { proveedorWallet } from "@/lib/wallet";

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

  const { data: tarjeta } = await crearClienteAdmin()
    .from("tarjetas")
    .select("id, serial, wallet_auth_token, puntos")
    .eq("cliente_id", cliente.clienteId)
    .eq("local_id", local.id)
    .maybeSingle();
  if (!tarjeta) return ir(`/t/${slug}`);

  try {
    const { archivo } = await apple.generarPase({
      serial: tarjeta.serial,
      token: tarjeta.wallet_auth_token,
      localSlug: local.slug,
      localNombre: local.nombre,
      clienteNombre: cliente.nombre,
      puntos: tarjeta.puntos,
      colorPrimario: local.color_primario,
      colorSecundario: local.color_secundario,
      logoUrl: local.logo_url,
      urlTarjeta: `${env.appUrl}/t/${local.slug}`,
      tarjetaId: tarjeta.id,
      clienteId: cliente.clienteId,
      localId: local.id,
    });
    if (!archivo) throw new Error("sin archivo");
    return new Response(Buffer.from(archivo), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="${local.slug}.pkpass"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    // Sin datos sensibles: sólo el mensaje (nunca certificados, tokens ni datos del cliente).
    console.error("Apple Wallet: no se pudo generar el pase", slug, e instanceof Error ? e.message : "error");
    return ir("/aviso?m=wallet_error");
  }
}
