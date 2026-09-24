"use server";

import { refresh } from "next/cache";
import { requerirLocal } from "@/lib/panel";

export type EstadoPremio = { error?: string; ok?: number };

export async function guardarPremio(slug: string, id: string | null, _prev: EstadoPremio, form: FormData): Promise<EstadoPremio> {
  const { db, local } = await requerirLocal(slug);
  const nombre = String(form.get("nombre") ?? "").trim();
  const descripcion = String(form.get("descripcion") ?? "").trim() || null;
  const puntos = Number(form.get("puntos"));
  if (nombre.length < 2 || nombre.length > 60) return { error: "El nombre tiene que tener entre 2 y 60 letras." };
  if (descripcion && descripcion.length > 140) return { error: "La descripción es muy larga (máx. 140)." };
  if (!Number.isInteger(puntos) || puntos < 1 || puntos > 1000) return { error: "Los puntos tienen que ser un número entre 1 y 1000." };

  const datos = { nombre, descripcion, puntos_necesarios: puntos };
  const { error } = id
    ? await db.from("premios").update(datos).eq("id", id).eq("local_id", local.id)
    : await db.from("premios").insert({ ...datos, local_id: local.id });
  if (error) return { error: "No se pudo guardar. Probá de nuevo." };
  refresh();
  return { ok: Date.now() };
}

export async function alternarPremio(slug: string, id: string, activo: boolean) {
  const { db, local } = await requerirLocal(slug);
  await db.from("premios").update({ activo }).eq("id", id).eq("local_id", local.id);
  refresh();
}

/** Si el premio ya se canjeó alguna vez, se desactiva en vez de borrarse (para no perder historial). */
export async function borrarPremio(slug: string, id: string) {
  const { db, local } = await requerirLocal(slug);
  const { count } = await db.from("canjes").select("id", { count: "exact", head: true }).eq("premio_id", id);
  if ((count ?? 0) > 0) {
    await db.from("premios").update({ activo: false }).eq("id", id).eq("local_id", local.id);
  } else {
    await db.from("premios").delete().eq("id", id).eq("local_id", local.id);
  }
  refresh();
}
