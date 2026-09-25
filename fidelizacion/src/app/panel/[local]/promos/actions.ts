"use server";

import { refresh } from "next/cache";
import { requerirLocal } from "@/lib/panel";

export type EstadoForm = { error?: string; ok?: number };

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function guardarRegalos(slug: string, _prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { db, local } = await requerirLocal(slug);
  const bienvenida = Number(form.get("puntos_bienvenida") || 0);
  const cumple = Number(form.get("puntos_cumple") || 0);
  for (const n of [bienvenida, cumple]) {
    if (!Number.isInteger(n) || n < 0 || n > 50) return { error: "Los puntos de regalo van de 0 a 50." };
  }
  const { error } = await db
    .from("locales")
    .update({ puntos_bienvenida: bienvenida, puntos_cumple: cumple })
    .eq("id", local.id);
  if (error) return { error: "No se pudo guardar." };
  refresh();
  return { ok: Date.now() };
}

export async function crearPromo(slug: string, _prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { db, local } = await requerirLocal(slug);
  const nombre = String(form.get("nombre") ?? "").trim();
  const dias = form.getAll("dias").map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  const todoElDia = form.get("todo_el_dia") === "on";
  const desde = todoElDia ? "00:00" : String(form.get("desde") ?? "");
  const hastaCrudo = todoElDia ? "24:00" : String(form.get("hasta") ?? "");
  const puntos = Number(form.get("puntos"));

  if (nombre.length < 2 || nombre.length > 40) return { error: "Poné un nombre de 2 a 40 letras (ej: Happy hour)." };
  if (!dias.length) return { error: "Elegí al menos un día." };
  if (!HORA.test(desde) || !(HORA.test(hastaCrudo) || hastaCrudo === "24:00")) return { error: "Revisá los horarios." };
  // "24:00" = hasta el final del día.
  const hasta = hastaCrudo === "24:00" || hastaCrudo === "00:00" ? "23:59:59.999" : hastaCrudo;
  if (hasta <= desde) return { error: "El horario de fin tiene que ser después del de inicio (no puede pasar la medianoche)." };
  if (![2, 3].includes(puntos)) return { error: "Elegí puntos dobles o triples." };

  const { error } = await db
    .from("promos")
    .insert({ local_id: local.id, nombre, dias: [...new Set(dias)], desde, hasta, puntos });
  if (error) return { error: "No se pudo guardar. Probá de nuevo." };
  refresh();
  return { ok: Date.now() };
}

export async function alternarPromo(slug: string, id: string, activa: boolean) {
  const { db, local } = await requerirLocal(slug);
  await db.from("promos").update({ activa }).eq("id", id).eq("local_id", local.id);
  refresh();
}

export async function borrarPromo(slug: string, id: string) {
  const { db, local } = await requerirLocal(slug);
  await db.from("promos").delete().eq("id", id).eq("local_id", local.id);
  refresh();
}
