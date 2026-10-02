import "server-only";
import { env } from "@/lib/env";

export type ProveedoresActivos = { google: boolean; apple: boolean };

/**
 * ¿Qué ingresos sociales están activos en Supabase (Authentication → Providers)?
 * Se consulta a Supabase y se guarda 5 minutos: cada botón aparece solo cuando
 * su proveedor está configurado, así nadie ve un botón que no funciona.
 */
export async function proveedoresActivos(): Promise<ProveedoresActivos> {
  try {
    const res = await fetch(`${env.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: env.supabaseAnonKey },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { google: false, apple: false };
    const s = (await res.json()) as { external?: { google?: boolean; apple?: boolean } };
    return { google: s.external?.google === true, apple: s.external?.apple === true };
  } catch {
    return { google: false, apple: false };
  }
}
