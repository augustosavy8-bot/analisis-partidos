import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";

/** Cuántos clientes tienen la tarjeta del local en cada billetera (sin repetir tarjetas). */
export async function alcanceBilleteras(localId: string) {
  const admin = crearClienteAdmin();
  const [{ data: google }, { data: apple }] = await Promise.all([
    admin.from("wallet_registros").select("tarjeta_id, tarjetas!inner(local_id)").eq("plataforma", "google").eq("tarjetas.local_id", localId),
    admin.from("apple_registrations").select("serial, apple_passes!inner(local_id)").eq("apple_passes.local_id", localId),
  ]);
  return {
    google: new Set((google ?? []).map((r) => r.tarjeta_id)).size,
    apple: new Set((apple ?? []).map((r) => r.serial)).size,
  };
}
