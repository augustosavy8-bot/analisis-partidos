"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { normalizarWhatsapp } from "@/lib/whatsapp";
import { buscarLocal } from "@/lib/locales";
import { toquePendienteActual, vincularCelular } from "@/lib/sesion-cliente";
import { urlResultado } from "@/lib/toque";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { leerCumple } from "@/lib/promos";
import { guardarCumpleCliente } from "@/lib/tarjeta";
import { ingresoPermitidoIp, numeroPermitido, registrarIntentoIp, registrarIntentoNumero } from "@/lib/app/servidor";

export type EstadoForm = { error?: string; valores?: Record<string, string> };

export async function registrarse(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const nombre = String(form.get("nombre") ?? "").trim().replace(/\s+/g, " ");
  const whatsappCrudo = String(form.get("whatsapp") ?? "");
  const valores = {
    nombre,
    whatsapp: whatsappCrudo,
    consentimiento: String(form.get("consentimiento") ?? ""),
    cumple_dia: String(form.get("cumple_dia") ?? ""),
    cumple_mes: String(form.get("cumple_mes") ?? ""),
  };

  if (nombre.length < 2 || nombre.length > 80) return { error: "Poné tu nombre.", valores };
  const whatsapp = normalizarWhatsapp(whatsappCrudo);
  if (!whatsapp) return { error: "Revisá el número de WhatsApp (con código de área).", valores };
  const cumple = leerCumple(form);
  if (cumple === "invalido") return { error: "Revisá tu cumple: elegí día y mes, o dejá los dos vacíos.", valores };
  if (form.get("consentimiento") !== "on") {
    return { error: "Para crear tu tarjeta tenés que aceptar la política de privacidad.", valores };
  }

  const toque = await toquePendienteActual();
  if (!toque) redirect("/aviso?m=toque_vencido");

  const { resultado, clienteId } = await vincularCelular({ nombre, whatsapp, localId: toque.localId });
  if (cumple) await guardarCumpleCliente(clienteId, cumple.dia, cumple.mes);
  redirect(resultado ? urlResultado(toque.localSlug, resultado) : `/t/${toque.localSlug}`);
}

export async function recuperar(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const whatsappCrudo = String(form.get("whatsapp") ?? "");
  const valores = { whatsapp: whatsappCrudo };
  const whatsapp = normalizarWhatsapp(whatsappCrudo);
  if (!whatsapp) return { error: "Revisá el número de WhatsApp (con código de área).", valores };

  // Recuperar por número no pide código (todavía no hay OTP). Para que nadie
  // pueda quedarse con la tarjeta de otro sabiendo su número, hace falta un
  // toque real del llavero (estar en el local) y hay límite por IP y por número.
  const toque = await toquePendienteActual();
  if (!toque) {
    return { error: "Pedile a quien te atiende que apoye el llavero en tu celular y después tocá “Recuperala con tu WhatsApp”.", valores };
  }
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() ?? null;
  if (!(await ingresoPermitidoIp(ip)) || !(await numeroPermitido(whatsapp))) {
    return { error: "Hiciste muchos intentos. Esperá un rato y probá de nuevo.", valores };
  }
  const local = await buscarLocal(toque.localSlug);
  if (!local) return { error: "No encontramos el local.", valores };

  const db = crearClienteAdmin();
  const { data: cliente } = await db.from("clientes").select("nombre").eq("whatsapp", whatsapp).maybeSingle();
  await Promise.all([registrarIntentoIp(ip, !!cliente), registrarIntentoNumero(whatsapp, !!cliente)]);
  if (!cliente) {
    return { error: "No encontramos una tarjeta con ese WhatsApp. ¿Lo escribiste bien?", valores };
  }

  // Hook OTP: cuando verificacionActiva() sea true, acá se pide y valida el código.

  const { resultado } = await vincularCelular({ nombre: cliente.nombre, whatsapp, localId: local.id });
  redirect(resultado ? urlResultado(local.slug, resultado) : `/t/${local.slug}`);
}
