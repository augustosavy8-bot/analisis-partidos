import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";

/** Días que un celular vinculado desde un local nuevo queda "a verificar". */
const DIAS_VERIFICAR = 30;

/**
 * ¿Este número ya es cliente pero todavía no tiene tarjeta en este local?
 * Sin código por WhatsApp no sabemos si el que escribe el número es el dueño (el
 * toque sólo prueba que está en un local, y cualquier local puede generar toques
 * con su QR de respaldo). Se vincula igual, para que la misma persona tenga
 * tarjetas en varios locales, pero el celular queda a verificar (marcarAVerificar).
 */
export async function esLocalNuevo(whatsapp: string, localId: string): Promise<boolean> {
  const db = crearClienteAdmin();
  const { data: cliente } = await db.from("clientes").select("id").eq("whatsapp", whatsapp).maybeSingle();
  if (!cliente) return false;
  const { count } = await db
    .from("tarjetas")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", cliente.id)
    .eq("local_id", localId);
  return !count;
}

/** Canjear las tarjetas que la cuenta ya tenía pide PIN del local, y no puede borrar la cuenta. */
export async function marcarAVerificar(tokenHash: string) {
  const hasta = new Date(Date.now() + DIAS_VERIFICAR * 86_400_000).toISOString();
  await crearClienteAdmin().from("dispositivos").update({ verificar_hasta: hasta }).eq("token_hash", tokenHash);
}
