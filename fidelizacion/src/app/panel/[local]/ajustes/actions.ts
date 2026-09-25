"use server";

import { refresh } from "next/cache";
import { requerirLocal } from "@/lib/panel";
import { esTermino } from "@/lib/terminos";

export type EstadoAjustes = { error?: string; ok?: number };

const HEX = /^#[0-9a-f]{6}$/i;

export async function guardarAjustes(slug: string, _prev: EstadoAjustes, form: FormData): Promise<EstadoAjustes> {
  const { db, local } = await requerirLocal(slug);
  const nombre = String(form.get("nombre") ?? "").trim();
  const rubro = String(form.get("rubro") ?? "").trim() || null;
  const colorPrimario = String(form.get("color_primario") ?? "");
  const colorSecundario = String(form.get("color_secundario") ?? "");
  const logo = String(form.get("logo_url") ?? "").trim() || null;
  const termino = String(form.get("termino_personal") ?? "mozo");
  const animacion = String(form.get("animacion_canje") ?? "check");
  const horas = Number(String(form.get("horas") ?? "").replace(",", "."));

  if (nombre.length < 2 || nombre.length > 60) return { error: "El nombre tiene que tener entre 2 y 60 letras." };
  if (rubro && rubro.length > 60) return { error: "El rubro es muy largo." };
  if (!HEX.test(colorPrimario) || !HEX.test(colorSecundario)) return { error: "Elegí colores válidos." };
  if (logo && !/^https:\/\/\S{4,500}$/.test(logo)) return { error: "El logo tiene que ser un link https a una imagen." };
  if (!esTermino(termino)) return { error: "Elegí cómo llamás a tu personal." };
  if (animacion !== "check" && animacion !== "cafe") return { error: "Elegí una animación de canje." };
  if (!Number.isFinite(horas) || horas < 0 || horas > 168) return { error: "La regla tiene que estar entre 0 y 168 horas." };

  const { error } = await db
    .from("locales")
    .update({
      nombre,
      rubro,
      color_primario: colorPrimario.toLowerCase(),
      color_secundario: colorSecundario.toLowerCase(),
      logo_url: logo,
      minutos_entre_puntos: Math.round(horas * 60),
      termino_personal: termino,
      animacion_canje: animacion,
    })
    .eq("id", local.id);
  if (error) return { error: "No se pudo guardar." };
  refresh();
  return { ok: Date.now() };
}
