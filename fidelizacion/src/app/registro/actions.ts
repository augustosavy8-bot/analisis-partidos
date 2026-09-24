"use server";

import { redirect } from "next/navigation";
import { normalizarWhatsapp } from "@/lib/whatsapp";
import { buscarLocal } from "@/lib/locales";
import { toquePendienteActual, vincularCelular } from "@/lib/sesion-cliente";
import { urlResultado } from "@/lib/toque";
import { crearClienteAdmin } from "@/lib/supabase/admin";

export type EstadoForm = { error?: string; valores?: Record<string, string> };

export async function registrarse(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const nombre = String(form.get("nombre") ?? "").trim().replace(/\s+/g, " ");
  const whatsappCrudo = String(form.get("whatsapp") ?? "");
  const valores = { nombre, whatsapp: whatsappCrudo, consentimiento: String(form.get("consentimiento") ?? "") };

  if (nombre.length < 2 || nombre.length > 80) return { error: "Poné tu nombre.", valores };
  const whatsapp = normalizarWhatsapp(whatsappCrudo);
  if (!whatsapp) return { error: "Revisá el número de WhatsApp (con código de área).", valores };
  if (form.get("consentimiento") !== "on") {
    return { error: "Para crear tu tarjeta tenés que aceptar la política de privacidad.", valores };
  }

  const toque = await toquePendienteActual();
  if (!toque) redirect("/aviso?m=toque_vencido");

  const { resultado } = await vincularCelular({ nombre, whatsapp, localId: toque.localId });
  redirect(resultado ? urlResultado(toque.localSlug, resultado) : `/t/${toque.localSlug}`);
}

export async function recuperar(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const whatsappCrudo = String(form.get("whatsapp") ?? "");
  const valores = { whatsapp: whatsappCrudo };
  const whatsapp = normalizarWhatsapp(whatsappCrudo);
  if (!whatsapp) return { error: "Revisá el número de WhatsApp (con código de área).", valores };

  const toque = await toquePendienteActual();
  const slug = toque?.localSlug ?? String(form.get("l") ?? "");
  const local = await buscarLocal(slug);
  if (!local) return { error: "No encontramos el local.", valores };

  const db = crearClienteAdmin();
  const { data: cliente } = await db.from("clientes").select("nombre").eq("whatsapp", whatsapp).maybeSingle();
  if (!cliente) {
    return { error: "No encontramos una tarjeta con ese WhatsApp. ¿Lo escribiste bien?", valores };
  }

  // Hook OTP: cuando verificacionActiva() sea true, acá se pide y valida el código.

  const { resultado } = await vincularCelular({ nombre: cliente.nombre, whatsapp, localId: local.id });
  redirect(resultado ? urlResultado(local.slug, resultado) : `/t/${local.slug}`);
}
