import "server-only";
import { timingSafeEqual } from "node:crypto";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import type { Local } from "@/lib/locales";

/**
 * Link personal de la tarjeta, para guardarla en una billetera (Pass2U hoy,
 * Apple/Google Wallet más adelante). Usa el serial y el wallet_auth_token de la
 * tarjeta: funciona sin cookie, en cualquier navegador. Es de sólo lectura.
 */
export function urlBilletera(serial: string, token: string) {
  return `${env.appUrl}/w/${serial}/${token}`;
}

export async function tarjetaPorPase(serial: string, token: string) {
  if (!/^[0-9a-f]{32}$/.test(serial) || !/^[0-9a-f]{64}$/.test(token)) return null;
  const db = crearClienteAdmin();
  const { data } = await db
    .from("tarjetas")
    .select(
      "id, cliente_id, wallet_auth_token, clientes(nombre), " +
        "locales(id, slug, nombre, rubro, logo_url, color_primario, color_secundario, minutos_entre_puntos, zona_horaria, termino_personal, puntos_bienvenida, puntos_cumple, animacion_canje, activo)",
    )
    .eq("serial", serial)
    .maybeSingle();
  if (!data) return null;
  const fila = data as unknown as {
    id: string;
    cliente_id: string;
    wallet_auth_token: string;
    clientes: { nombre: string } | null;
    locales: (Local & { activo: boolean }) | null;
  };
  const a = Buffer.from(fila.wallet_auth_token);
  const b = Buffer.from(token);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (!fila.locales?.activo) return null;
  return { clienteId: fila.cliente_id, nombre: fila.clientes?.nombre ?? "", local: fila.locales };
}
