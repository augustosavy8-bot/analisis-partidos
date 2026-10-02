import "server-only";
import { env } from "@/lib/env";

/**
 * ¿Está activo el ingreso con Google en Supabase (Authentication → Providers)?
 * Se consulta a Supabase y se guarda 5 minutos: el botón aparece solo cuando
 * el proveedor está configurado, así nadie ve un botón que no funciona.
 */
export async function googleActivo(): Promise<boolean> {
  try {
    const res = await fetch(`${env.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: env.supabaseAnonKey },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;
    const s = (await res.json()) as { external?: { google?: boolean } };
    return s.external?.google === true;
  } catch {
    return false;
  }
}
