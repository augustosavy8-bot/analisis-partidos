import { crearClienteAdmin } from "@/lib/supabase/admin";
import { autorizarPase, idSeguro, vacio } from "@/lib/wallet/apple-servicio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = RouteContext<"/api/apple-wallet/v1/devices/[deviceId]/registrations/[passTypeId]/[serial]">;

/** Registrar un dispositivo para recibir actualizaciones del pase (201 nuevo, 200 ya existía). */
export async function POST(req: Request, { params }: Ctx) {
  const { deviceId, passTypeId, serial } = await params;
  const { error } = await autorizarPase(req, passTypeId, serial);
  if (error) return error;
  if (!idSeguro(deviceId)) return vacio(400);

  let pushToken = "";
  try {
    pushToken = String(((await req.json()) as { pushToken?: unknown }).pushToken ?? "");
  } catch {}
  if (!idSeguro(pushToken)) return vacio(400);

  const db = crearClienteAdmin();
  const { error: e1 } = await db
    .from("apple_devices")
    .upsert({ device_library_id: deviceId, push_token: pushToken, updated_at: new Date().toISOString() }, { onConflict: "device_library_id" });
  if (e1) return vacio(500);

  const { data: existe } = await db.from("apple_registrations").select("serial").eq("device_library_id", deviceId).eq("serial", serial).maybeSingle();
  if (existe) return vacio(200);
  const { error: e2 } = await db.from("apple_registrations").insert({ device_library_id: deviceId, serial });
  if (e2) return e2.code === "23505" ? vacio(200) : vacio(500);
  return vacio(201);
}

/** Desregistrar el dispositivo (el cliente borró el pase o apagó las actualizaciones). */
export async function DELETE(req: Request, { params }: Ctx) {
  const { deviceId, passTypeId, serial } = await params;
  const { error } = await autorizarPase(req, passTypeId, serial);
  if (error) return error;
  if (!idSeguro(deviceId)) return vacio(400);

  const db = crearClienteAdmin();
  await db.from("apple_registrations").delete().eq("device_library_id", deviceId).eq("serial", serial);
  // Si el dispositivo ya no sigue ningún pase, lo borramos (y su push token).
  const { count } = await db.from("apple_registrations").select("serial", { count: "exact", head: true }).eq("device_library_id", deviceId);
  if (!count) await db.from("apple_devices").delete().eq("device_library_id", deviceId);
  return vacio(200);
}
