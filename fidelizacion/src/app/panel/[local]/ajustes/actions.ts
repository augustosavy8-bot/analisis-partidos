"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { notificarCambioLocal } from "@/lib/wallet";
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
  const horas = Number(String(form.get("horas") ?? "").replace(",", "."));
  const latTxt = String(form.get("latitud") ?? "").trim().replace(",", ".");
  const lngTxt = String(form.get("longitud") ?? "").trim().replace(",", ".");
  const latitud = latTxt ? Number(latTxt) : null;
  const longitud = lngTxt ? Number(lngTxt) : null;

  if (nombre.length < 2 || nombre.length > 60) return { error: "El nombre tiene que tener entre 2 y 60 letras." };
  if (rubro && rubro.length > 60) return { error: "El rubro es muy largo." };
  if (!HEX.test(colorPrimario) || !HEX.test(colorSecundario)) return { error: "Elegí colores válidos." };
  if (logo && !/^https:\/\/\S{4,500}$/.test(logo)) return { error: "El logo tiene que ser un link https a una imagen." };
  if (!esTermino(termino)) return { error: "Elegí cómo llamás a tu personal." };
  if (!Number.isFinite(horas) || horas < 0 || horas > 168) return { error: "La regla tiene que estar entre 0 y 168 horas." };
  if ((latitud === null) !== (longitud === null)) return { error: "Cargá latitud y longitud juntas (o dejá las dos vacías)." };
  if (latitud !== null && (!Number.isFinite(latitud) || latitud < -90 || latitud > 90)) return { error: "La latitud tiene que estar entre -90 y 90." };
  if (longitud !== null && (!Number.isFinite(longitud) || longitud < -180 || longitud > 180)) return { error: "La longitud tiene que estar entre -180 y 180." };

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
      latitud,
      longitud,
    })
    .eq("id", local.id);
  if (error) return { error: "No se pudo guardar." };
  after(() => notificarCambioLocal(local.id)); // clase de Google y pases de Apple (nombre, logo, colores)
  refresh();
  return { ok: Date.now() };
}
