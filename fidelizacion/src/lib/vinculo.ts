import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";

export const MENSAJE_OTRO_LOCAL =
  "Ese WhatsApp ya tiene tarjeta en otro local. Para usarla en este celular, recuperala en un local donde ya sumaste, o seguí usándola desde el celular donde la tenés.";

/**
 * ¿Se puede vincular un celular nuevo a este número desde este local?
 * Sin código por WhatsApp no sabemos si el que escribe el número es el dueño: el
 * toque sólo prueba que está en un local, y cualquier dueño de un local (aunque
 * sea uno recién creado) puede generar toques con su QR de respaldo. Por eso un
 * número que ya existe sólo se vincula en un local donde ese cliente ya tiene
 * tarjeta: así nadie puede entrar a cuentas ajenas desde su propio local.
 */
export async function vinculoPermitido(whatsapp: string, localId: string): Promise<"nuevo" | "ok" | "otro_local"> {
  const db = crearClienteAdmin();
  const { data: cliente } = await db.from("clientes").select("id").eq("whatsapp", whatsapp).maybeSingle();
  if (!cliente) return "nuevo";
  const { count } = await db
    .from("tarjetas")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", cliente.id)
    .eq("local_id", localId);
  return count ? "ok" : "otro_local";
}
