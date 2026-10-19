"use server";

import { requerirSuperadmin } from "@/lib/admin";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { enviarMail } from "@/lib/mail";
import { esIdMailDueno, MAILS_DUENOS, type IdMailDueno } from "@/lib/anuncio";

export type ResultadoAnuncio = { error?: string; enviados?: number; fallidos?: number };

export type Dueno = { email: string; locales: string[] };

/** Dueños de locales activos (un email una vez, con sus locales). */
async function duenos(): Promise<Dueno[]> {
  const { data, error } = await crearClienteAdmin().rpc("destinatarios_resumen");
  if (error) throw new Error(error.message);
  const porEmail = new Map<string, string[]>();
  for (const d of (data ?? []) as { email: string; local_nombre: string }[]) {
    const e = d.email.toLowerCase();
    porEmail.set(e, [...(porEmail.get(e) ?? []), d.local_nombre]);
  }
  return [...porEmail].map(([email, locales]) => ({ email, locales }));
}

export async function listarDuenos() {
  await requerirSuperadmin();
  return duenos();
}

/**
 * `destino`: "prueba" (sólo a tu mail), "todos" (todos los dueños) o el email de un
 * dueño. La clave de idempotencia evita que Resend lo mande dos veces a la misma
 * persona (en 24 hs).
 */
export async function mandarAnuncio(id: IdMailDueno, destino: string): Promise<ResultadoAnuncio> {
  const { email } = await requerirSuperadmin();
  if (!esIdMailDueno(id)) return { error: "Mail desconocido." };
  if (!env.mail) return { error: "Faltan RESEND_API_KEY o MAIL_DESDE en Vercel." };
  const mail = MAILS_DUENOS[id].armar(`${env.appUrl}/panel`);
  const prueba = destino === "prueba";
  const lista = prueba ? [] : (await duenos()).map((d) => d.email);
  const para = prueba ? [email] : destino === "todos" ? lista : lista.filter((e) => e === destino.toLowerCase());
  if (!para.length) return { error: prueba ? "Tu usuario no tiene email." : "Ese mail no es de ningún dueño." };
  let enviados = 0;
  let fallidos = 0;
  for (const e of para) {
    const ok = await enviarMail({ para: e, ...mail, idempotencia: prueba ? undefined : `${id}-2026-10-${e}` });
    if (ok) enviados++;
    else fallidos++;
  }
  return { enviados, fallidos };
}
