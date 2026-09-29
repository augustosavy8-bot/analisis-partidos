import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import type { TipoMovimiento } from "@/lib/movimientos";

/** Tipo del último movimiento de la tarjeta: decide el texto/aviso de la billetera. */
export async function ultimoMovimiento(tarjetaId: string): Promise<TipoMovimiento | null> {
  const { data } = await crearClienteAdmin()
    .from("movimientos")
    .select("tipo")
    .eq("tarjeta_id", tarjetaId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.tipo as TipoMovimiento | undefined) ?? null;
}
