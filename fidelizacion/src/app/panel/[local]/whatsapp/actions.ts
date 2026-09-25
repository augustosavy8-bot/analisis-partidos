"use server";

import { refresh } from "next/cache";
import { requerirLocal } from "@/lib/panel";
import { esSegmento } from "@/lib/reactivar";

const UUID = /^[0-9a-f-]{36}$/;

export async function guardarPlantilla(slug: string, segmento: string, texto: string): Promise<{ error?: string }> {
  const { db, local } = await requerirLocal(slug);
  if (!esSegmento(segmento)) return { error: "Segmento inválido." };
  const limpio = texto.trim();
  if (limpio.length < 5 || limpio.length > 700) return { error: "El mensaje tiene que tener entre 5 y 700 caracteres." };
  const plantillas = { ...local.plantillas_whatsapp, [segmento]: limpio };
  const { error } = await db.from("locales").update({ plantillas_whatsapp: plantillas }).eq("id", local.id);
  if (error) return { error: "No se pudo guardar." };
  refresh();
  return {};
}

/** Registra que el dueño abrió WhatsApp para escribirle a este cliente. */
export async function registrarContacto(slug: string, clienteId: string, segmento: string) {
  const { db, local } = await requerirLocal(slug);
  if (!UUID.test(clienteId) || !esSegmento(segmento)) return;
  await db.from("contactos_whatsapp").insert({ local_id: local.id, cliente_id: clienteId, segmento });
  refresh();
}

export async function marcarNoContactar(slug: string, clienteId: string, valor: boolean) {
  const { db, local } = await requerirLocal(slug);
  if (!UUID.test(clienteId)) return;
  await db.from("tarjetas").update({ no_contactar: valor }).eq("local_id", local.id).eq("cliente_id", clienteId);
  refresh();
}
