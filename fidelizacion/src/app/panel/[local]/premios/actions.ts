"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { notificarCambioLocal } from "@/lib/wallet";
import { requerirLocal } from "@/lib/panel";
import { exigirFuncion, exigirLimite } from "@/lib/facturacion/acceso-servidor";

export type EstadoPremio = { error?: string; ok?: number };

export async function guardarPremio(slug: string, id: string | null, _prev: EstadoPremio, form: FormData): Promise<EstadoPremio> {
  const { db, local } = await requerirLocal(slug);
  const nombre = String(form.get("nombre") ?? "").trim();
  const descripcion = String(form.get("descripcion") ?? "").trim() || null;
  const puntos = Number(form.get("puntos"));
  if (nombre.length < 2 || nombre.length > 60) return { error: "El nombre tiene que tener entre 2 y 60 letras." };
  if (descripcion && descripcion.length > 140) return { error: "La descripción es muy larga (máx. 140)." };
  if (!Number.isInteger(puntos) || puntos < 1 || puntos > 1000) return { error: "Los puntos tienen que ser un número entre 1 y 1000." };

  // Plan y estado de la cuenta: lo decide el servidor (nunca el navegador).
  const bloqueo = await exigirFuncion(local.id, "crear_premio");
  if (bloqueo) return { error: bloqueo };
  if (!id) {
    const { count } = await db.from("premios").select("id", { count: "exact", head: true }).eq("local_id", local.id).eq("activo", true);
    const limite = await exigirLimite(local.id, "premios", (count ?? 0) + 1);
    if (limite) return { error: limite };
  }

  const datos = { nombre, descripcion, puntos_necesarios: puntos };
  const { error } = id
    ? await db.from("premios").update(datos).eq("id", id).eq("local_id", local.id)
    : await db.from("premios").insert({ ...datos, local_id: local.id });
  if (error) return { error: "No se pudo guardar. Probá de nuevo." };
  after(() => notificarCambioLocal(local.id)); // premios en los pases de Google y Apple
  refresh();
  return { ok: Date.now() };
}

export async function alternarPremio(slug: string, id: string, activo: boolean) {
  const { db, local } = await requerirLocal(slug);
  if (activo) {
    // Reactivar un premio cuenta para el límite del plan.
    if (await exigirFuncion(local.id, "crear_premio")) return;
    const { count } = await db.from("premios").select("id", { count: "exact", head: true }).eq("local_id", local.id).eq("activo", true);
    if (await exigirLimite(local.id, "premios", (count ?? 0) + 1)) return;
  }
  await db.from("premios").update({ activo }).eq("id", id).eq("local_id", local.id);
  after(() => notificarCambioLocal(local.id));
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
  after(() => notificarCambioLocal(local.id));
  refresh();
}
