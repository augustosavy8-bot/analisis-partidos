import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Cliente con service_role: saltea RLS. Usar SÓLO en el servidor, para los flujos
 * del cliente final (que no tiene cuenta) y operaciones de superadmin ya autorizadas.
 */
export function crearClienteAdmin() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
