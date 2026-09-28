import { NextResponse, type NextRequest } from "next/server";
import { buscarLocal } from "@/lib/locales";
import { clienteActual } from "@/lib/sesion-cliente";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { premiosDelLocal, proximoPremio } from "@/lib/tarjeta";
import { proveedorWallet } from "@/lib/wallet";
import { sincronizarClaseLocal } from "@/lib/wallet/google";

export const dynamic = "force-dynamic";

/**
 * "Agregar a Google Wallet": asegura la clase del local y el objeto de la tarjeta
 * en Google (upsert por API), registra el pedido en wallet_registros y redirige
 * a pay.google.com con un JWT skinny (sólo el id del objeto).
 */
export async function GET(req: NextRequest, { params }: RouteContext<"/t/[local]/google-wallet">) {
  const { local: slug } = await params;
  const ir = (ruta: string) => NextResponse.redirect(new URL(ruta, req.url), 303);

  const google = proveedorWallet("google");
  const [local, cliente] = await Promise.all([buscarLocal(slug), clienteActual()]);
  if (!local) return ir("/aviso?m=local_inactivo");
  if (!google || !cliente) return ir(`/t/${slug}`);

  const db = crearClienteAdmin();
  const [{ data: tarjeta }, premios] = await Promise.all([
    db.from("tarjetas").select("id, serial, wallet_auth_token, puntos").eq("cliente_id", cliente.clienteId).eq("local_id", local.id).maybeSingle(),
    premiosDelLocal(local.id),
  ]);
  if (!tarjeta) return ir(`/t/${slug}`);

  try {
    // La clase tiene que existir antes que el objeto (y así queda al día con los premios).
    await sincronizarClaseLocal(local.id);
    const proximo = proximoPremio(premios, tarjeta.puntos);
    const { url } = await google.generarPase({
      serial: tarjeta.serial,
      token: tarjeta.wallet_auth_token,
      localSlug: local.slug,
      localNombre: local.nombre,
      clienteNombre: cliente.nombre,
      puntos: tarjeta.puntos,
      proximoPremio: proximo ? { nombre: proximo.nombre, puntosNecesarios: proximo.puntos_necesarios } : undefined,
      colorPrimario: local.color_primario,
      colorSecundario: local.color_secundario,
      logoUrl: local.logo_url,
      urlTarjeta: `${env.appUrl}/t/${local.slug}`,
    });
    if (!url) throw new Error("sin url");

    // Registro por intención (todavía sin callbacks de Google): una fila por tarjeta.
    const { data: registro } = await db
      .from("wallet_registros")
      .select("id")
      .eq("tarjeta_id", tarjeta.id)
      .eq("plataforma", "google")
      .limit(1)
      .maybeSingle();
    if (!registro) await db.from("wallet_registros").insert({ tarjeta_id: tarjeta.id, plataforma: "google" });

    return NextResponse.redirect(url, 303);
  } catch (e) {
    console.error("Google Wallet: no se pudo generar el pase", slug, e);
    return ir("/aviso?m=wallet_error");
  }
}
