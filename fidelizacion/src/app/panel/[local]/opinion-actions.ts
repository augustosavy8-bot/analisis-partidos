"use server";

import { after } from "next/server";
import { requerirLocal } from "@/lib/panel";
import { puedeOpinar } from "@/lib/opiniones";
import { enviarMail } from "@/lib/mail";
import { env } from "@/lib/env";

const escapar = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Guarda las estrellas (al tocarlas). Devuelve el id para sumarle después el comentario. */
export async function opinar(slug: string, estrellas: number): Promise<{ id?: string; error?: string }> {
  const { admin, local, userId, email } = await requerirLocal(slug);
  if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) return { error: "Elegí de 1 a 5 estrellas." };
  if (!(await puedeOpinar(local.id, local.slug, userId))) return { error: "Sólo opinan los dueños y encargados del local." };
  const { data, error } = await admin.from("opiniones").insert({ local_id: local.id, user_id: userId, estrellas }).select("id").single();
  if (error || !data) return { error: "No se pudo guardar. Probá de nuevo." };
  if (estrellas <= 2) after(() => avisarOpinionBaja(local.nombre, email, estrellas, null));
  return { id: data.id };
}

/** Comentario de quien puso 1 a 3 estrellas ("¿Qué mejorarías?"). */
export async function comentar(slug: string, id: string, comentario: string): Promise<{ ok?: boolean; error?: string }> {
  const { admin, local, userId, email } = await requerirLocal(slug);
  const texto = comentario.trim().slice(0, 1000);
  if (!texto) return { ok: true };
  const { data, error } = await admin
    .from("opiniones")
    .update({ comentario: texto })
    .eq("id", id)
    .eq("local_id", local.id)
    .eq("user_id", userId)
    .select("estrellas")
    .maybeSingle();
  if (error || !data) return { error: "No se pudo enviar. Probá de nuevo." };
  if (data.estrellas && data.estrellas <= 2) after(() => avisarOpinionBaja(local.nombre, email, data.estrellas!, texto));
  return { ok: true };
}

/** Cerró el cartel sin opinar: no vuelve a aparecer por un mes. */
export async function cerrarOpinion(slug: string): Promise<void> {
  const { admin, local, userId } = await requerirLocal(slug);
  if (!(await puedeOpinar(local.id, local.slug, userId))) return;
  await admin.from("opiniones").insert({ local_id: local.id, user_id: userId });
}

/** 1 o 2 estrellas: mail a Point para llamar ese mismo día. */
async function avisarOpinionBaja(local: string, email: string, estrellas: number, comentario: string | null) {
  const para = env.mail?.responderA;
  if (!para) return;
  const estrellasTxt = "★".repeat(estrellas) + "☆".repeat(5 - estrellas);
  await enviarMail({
    para,
    asunto: `${local} puso ${estrellas} ${estrellas === 1 ? "estrella" : "estrellas"} a Point`,
    texto: `${local} (${email}) puso ${estrellasTxt}.${comentario ? `\n\n"${comentario}"` : ""}\n\nVer todas: ${env.appUrl}/admin/opiniones`,
    html: `<p><strong>${escapar(local)}</strong> (${escapar(email)}) puso <span style="color:#f5b301">${estrellasTxt}</span>.</p>${
      comentario ? `<blockquote style="border-left:3px solid #ddd;margin:0;padding-left:12px;color:#555">${escapar(comentario)}</blockquote>` : ""
    }<p><a href="${env.appUrl}/admin/opiniones">Ver todas las opiniones</a></p>`,
  });
}
