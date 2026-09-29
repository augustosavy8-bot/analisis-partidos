import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import type { Local } from "@/lib/locales";
import { proveedorWallet } from "./index";

/**
 * .pkpass de Apple Wallet de la tarjeta de un cliente en un local (lo usan la web
 * y la app). null si Apple Wallet no está configurado o el cliente no tiene tarjeta ahí.
 */
export async function pkpassDeTarjeta(cliente: { clienteId: string; nombre: string }, local: Local): Promise<Buffer | null> {
  const apple = proveedorWallet("apple");
  if (!apple) return null;
  const { data: tarjeta } = await crearClienteAdmin()
    .from("tarjetas")
    .select("id, serial, wallet_auth_token, puntos")
    .eq("cliente_id", cliente.clienteId)
    .eq("local_id", local.id)
    .maybeSingle();
  if (!tarjeta) return null;
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
  return Buffer.from(archivo);
}

export const cabecerasPkpass = (slug: string) => ({
  "Content-Type": "application/vnd.apple.pkpass",
  "Content-Disposition": `attachment; filename="${slug}.pkpass"`,
  "Cache-Control": "no-store",
});
