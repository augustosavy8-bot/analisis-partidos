import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";

/**
 * Registros que sirven por un tiempo y si no crecen para siempre: los intentos
 * (límites de ingreso y de PIN miran como mucho las últimas 24 h) y los toques
 * rechazados (el superadmin mira los últimos 7 días). Días que se guardan:
 */
const RETENCION_DIAS = { intentos_app: 7, intentos_pin: 7, rechazos: 90 } as const;

/** Cada tanto (1 de cada 200 llamadas) borra lo viejo de la tabla. Nunca lanza. */
export async function limpiarDeVezEnCuando(tabla: keyof typeof RETENCION_DIAS) {
  if (Math.random() >= 1 / 200) return;
  try {
    const hasta = new Date(Date.now() - RETENCION_DIAS[tabla] * 86_400_000).toISOString();
    const { error } = await crearClienteAdmin().from(tabla).delete().lt("created_at", hasta);
    if (error) console.error("Limpieza: no se pudo borrar lo viejo de", tabla, error.message);
  } catch (e) {
    console.error("Limpieza: falló", tabla, e instanceof Error ? e.message : e);
  }
}
