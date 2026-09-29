import { NextResponse, type NextRequest } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { idSeguro, passTypeValido, vacio } from "@/lib/wallet/apple-servicio";
import { leerTag, tagActualizacion } from "@/lib/wallet/apple-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Seriales de los pases del dispositivo que cambiaron desde passesUpdatedSince.
 * (Según la spec, este endpoint no lleva Authorization.) 204 si no hay cambios.
 */
export async function GET(req: NextRequest, { params }: RouteContext<"/api/apple-wallet/v1/devices/[deviceId]/registrations/[passTypeId]">) {
  const { deviceId, passTypeId } = await params;
  if (!passTypeValido(passTypeId)) return vacio(404);
  if (!idSeguro(deviceId)) return vacio(400);

  const desde = leerTag(req.nextUrl.searchParams.get("passesUpdatedSince"));
  const db = crearClienteAdmin();
  const { data: regs } = await db.from("apple_registrations").select("serial").eq("device_library_id", deviceId);
  const seriales = (regs ?? []).map((r) => r.serial);
  if (!seriales.length) return vacio(204);

  let consulta = db.from("apple_passes").select("serial, updated_at").in("serial", seriales);
  if (desde) consulta = consulta.gt("updated_at", desde.toISOString());
  const { data: pases } = await consulta;
  if (!pases?.length) return vacio(204);

  const ultima = new Date(Math.max(...pases.map((p) => Date.parse(p.updated_at))));
  return NextResponse.json({ serialNumbers: pases.map((p) => p.serial), lastUpdated: tagActualizacion(ultima) });
}
