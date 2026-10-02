import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import type { Local } from "@/lib/locales";

/** Usuario del panel logueado, o redirige al ingreso. */
export const requerirUsuario = cache(async () => {
  const db = await crearClienteServidor();
  const { data } = await db.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/panel/ingresar");
  return { db, userId: claims.sub as string, email: (claims.email as string | undefined) ?? "" };
});

/** Locales que el usuario puede gestionar (RLS: los suyos, o todos si es superadmin). */
export const localesDelUsuario = cache(async () => {
  const { db } = await requerirUsuario();
  const { data } = await db.from("locales").select("id, slug, nombre").order("nombre");
  return data ?? [];
});

/**
 * El local del panel. Si el usuario no lo gestiona, RLS no lo devuelve → 404.
 *
 * `admin` es para ESCRIBIR locales, premios, promos y mozos: el usuario logueado
 * no tiene permiso de escritura directa sobre esas tablas (si lo tuviera, podría
 * saltearse los límites del plan llamando a la API de Supabase). Las acciones
 * validan plan y datos y escriben con `admin`, siempre filtrando por `local.id`.
 */
export const requerirLocal = cache(async (slug: string) => {
  const { db, userId, email } = await requerirUsuario();
  const { data: local } = await db
    .from("locales")
    .select("id, slug, nombre, rubro, logo_url, icono_url, color_primario, color_secundario, color_texto, color_etiqueta, franja_url, nombre_programa, texto_dorso, minutos_entre_puntos, zona_horaria, termino_personal, puntos_bienvenida, puntos_cumple, latitud, longitud, plantillas_whatsapp")
    .eq("slug", slug)
    .maybeSingle();
  if (!local) notFound();
  return { db, admin: crearClienteAdmin(), userId, email, local: local as Local & { plantillas_whatsapp: Record<string, string> } };
});

export function fechaHora(iso: string | null, zona: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: zona,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function fecha(iso: string | null, zona: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-AR", { timeZone: zona, day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}
