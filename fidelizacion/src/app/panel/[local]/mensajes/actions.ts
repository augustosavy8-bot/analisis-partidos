"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { requerirLocal } from "@/lib/panel";
import { enviarMensajeLocal } from "@/lib/wallet";
import { LIMITES_MENSAJE } from "@/lib/mensajes";
import { exigirFuncion } from "@/lib/facturacion/acceso-servidor";

export type EstadoMensaje = { error?: string; ok?: number; proximo?: string };

export async function enviarMensaje(slug: string, _prev: EstadoMensaje, form: FormData): Promise<EstadoMensaje> {
  const { admin, local, userId } = await requerirLocal(slug);
  const bloqueo = await exigirFuncion(local.id, "mensajes");
  if (bloqueo) return { error: bloqueo };
  const titulo = String(form.get("titulo") ?? "").trim().replace(/\s+/g, " ");
  const texto = String(form.get("texto") ?? "").trim().replace(/[ \t]+/g, " ");

  if (titulo.length < 2 || titulo.length > LIMITES_MENSAJE.titulo) return { error: `El título va de 2 a ${LIMITES_MENSAJE.titulo} caracteres.` };
  if (texto.length < 2 || texto.length > LIMITES_MENSAJE.texto) return { error: `El mensaje va de 2 a ${LIMITES_MENSAJE.texto} caracteres.` };

  // Límite de mensajes (por defecto 1 por día, configurable por local): lo controla la base (atómico).
  const { data, error } = await admin.rpc("registrar_mensaje_local_de", { p_user_id: userId, p_local_id: local.id, p_titulo: titulo, p_texto: texto });
  if (error || !data) return { error: "No se pudo enviar. Probá de nuevo." };
  if (!data.ok) return { error: "Todavía no podés mandar otro mensaje.", proximo: data.proximo };

  after(() => enviarMensajeLocal({ id: data.id, localId: local.id, titulo, texto }));
  refresh();
  return { ok: Date.now() };
}
