import "server-only";
import { cache } from "react";
import { crearClienteAdmin } from "@/lib/supabase/admin";

export type Local = {
  id: string;
  slug: string;
  nombre: string;
  rubro: string | null;
  logo_url: string | null;
  /** Ícono de notificaciones subido desde el panel (PNG cuadrado). Si no hay, se usa el logo. */
  icono_url: string | null;
  color_primario: string;
  color_secundario: string;
  minutos_entre_puntos: number;
  zona_horaria: string;
  termino_personal: string;
  puntos_bienvenida: number;
  puntos_cumple: number;
  /** Coordenadas (opcionales) para las locations del pase de Apple Wallet. */
  latitud: number | null;
  longitud: number | null;
};

export const buscarLocal = cache(async (slug: string): Promise<Local | null> => {
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) return null;
  const db = crearClienteAdmin();
  const { data } = await db
    .from("locales")
    .select("id, slug, nombre, rubro, logo_url, icono_url, color_primario, color_secundario, minutos_entre_puntos, zona_horaria, termino_personal, puntos_bienvenida, puntos_cumple, latitud, longitud")
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle();
  return data;
});

/** Color de texto legible (blanco o casi negro) sobre un fondo hex. */
export function colorTextoSobre(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.45 ? "#1c1917" : "#ffffff";
}

