"use server";

import { refresh } from "next/cache";
import { requerirLocal } from "@/lib/panel";
import { esPinValido, hashearPin } from "@/lib/pin";

export type EstadoMozo = { error?: string; ok?: number };

export async function crearMozo(slug: string, _prev: EstadoMozo, form: FormData): Promise<EstadoMozo> {
  const { db, local } = await requerirLocal(slug);
  const nombre = String(form.get("nombre") ?? "").trim();
  const pin = String(form.get("pin") ?? "").trim();
  if (nombre.length < 2 || nombre.length > 40) return { error: "Poné el nombre del mozo." };
  if (!esPinValido(pin)) return { error: "El PIN tiene que tener entre 4 y 6 números." };

  const { error } = await db.from("mozos").insert({ local_id: local.id, nombre, pin_hash: hashearPin(pin) });
  if (error) return { error: "No se pudo crear el mozo." };
  refresh();
  return { ok: Date.now() };
}

export async function cambiarPin(slug: string, id: string, _prev: EstadoMozo, form: FormData): Promise<EstadoMozo> {
  const { db, local } = await requerirLocal(slug);
  const pin = String(form.get("pin") ?? "").trim();
  if (!esPinValido(pin)) return { error: "El PIN tiene que tener entre 4 y 6 números." };
  const { error } = await db.from("mozos").update({ pin_hash: hashearPin(pin) }).eq("id", id).eq("local_id", local.id);
  if (error) return { error: "No se pudo cambiar el PIN." };
  refresh();
  return { ok: Date.now() };
}

export async function alternarMozo(slug: string, id: string, activo: boolean) {
  const { db, local } = await requerirLocal(slug);
  await db.from("mozos").update({ activo }).eq("id", id).eq("local_id", local.id);
  refresh();
}
