"use server";

import { refresh } from "next/cache";
import { requerirLocal } from "@/lib/panel";
import { esSegmento, SEGMENTOS } from "@/lib/reactivar";
import { redactarMensajeReactivar } from "@/lib/ia";
import { promosDelLocal, premiosDelLocal } from "@/lib/tarjeta";
import { describirPromo } from "@/lib/promos";

const UUID = /^[0-9a-f-]{36}$/;

export async function guardarPlantilla(slug: string, segmento: string, texto: string): Promise<{ error?: string }> {
  const { admin, local } = await requerirLocal(slug);
  if (!esSegmento(segmento)) return { error: "Segmento inválido." };
  const limpio = texto.trim();
  if (limpio.length < 5 || limpio.length > 700) return { error: "El mensaje tiene que tener entre 5 y 700 caracteres." };
  const plantillas = { ...local.plantillas_whatsapp, [segmento]: limpio };
  const { error } = await admin.from("locales").update({ plantillas_whatsapp: plantillas }).eq("id", local.id);
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

/**
 * La IA escribe el mensaje para los que no vienen hace `dias` días. Devuelve una
 * plantilla (con {nombre}, {link}…) que el dueño revisa antes de usar.
 */
export async function escribirConIA(slug: string, dias: number, pedido: string): Promise<{ texto?: string; error?: string }> {
  const { db, local } = await requerirLocal(slug);
  if (!SEGMENTOS.inactivos.valores.includes(dias)) return { error: "Elegí un período válido." };
  const pedidoLimpio = pedido.trim().slice(0, 200) || null;
  const [premios, promos, { data: lista }] = await Promise.all([
    premiosDelLocal(local.id),
    promosDelLocal(local.id),
    db.rpc("panel_reactivar", { p_local_id: local.id, p_segmento: "inactivos", p_valor: dias }),
  ]);
  return redactarMensajeReactivar(local.id, {
    local: local.nombre,
    rubro: local.rubro,
    dias,
    cantidad: (lista ?? []).length,
    premios: premios.map((p) => ({ nombre: p.nombre, puntos: p.puntos_necesarios })),
    promos: promos.map((p) => `${p.nombre}: ${describirPromo(p)}`),
    pedido: pedidoLimpio,
  });
}
