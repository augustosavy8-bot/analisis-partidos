"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { notificarCambioLocal } from "@/lib/wallet";
import { requerirLocal } from "@/lib/panel";
import { esTermino } from "@/lib/terminos";
import { leerCoordenadas } from "@/lib/coordenadas";
import { exigirFuncion } from "@/lib/facturacion/acceso-servidor";

export type EstadoAjustes = { error?: string; ok?: number };

export async function guardarAjustes(slug: string, _prev: EstadoAjustes, form: FormData): Promise<EstadoAjustes> {
  const { admin, local } = await requerirLocal(slug);
  const nombre = String(form.get("nombre") ?? "").trim();
  const rubro = String(form.get("rubro") ?? "").trim() || null;
  const termino = String(form.get("termino_personal") ?? "mozo");
  const horas = Number(String(form.get("horas") ?? "").replace(",", "."));
  let latTxt = String(form.get("latitud") ?? "").trim();
  let lngTxt = String(form.get("longitud") ?? "").trim();
  // Si pegaron "lat, lng" entero en un solo campo, lo separamos.
  const pegado = !lngTxt ? leerCoordenadas(latTxt) : !latTxt ? leerCoordenadas(lngTxt) : null;
  if (pegado) [latTxt, lngTxt] = [String(pegado.latitud), String(pegado.longitud)];
  const latitud = latTxt ? Number(latTxt.replace(",", ".")) : null;
  const longitud = lngTxt ? Number(lngTxt.replace(",", ".")) : null;

  if (nombre.length < 2 || nombre.length > 60) return { error: "El nombre tiene que tener entre 2 y 60 letras." };
  if (rubro && rubro.length > 60) return { error: "El rubro es muy largo." };
  if (!esTermino(termino)) return { error: "Elegí cómo llamás a tu personal." };
  if (!Number.isFinite(horas) || horas < 0 || horas > 168) return { error: "La regla tiene que estar entre 0 y 168 horas." };
  const bloqueo = await exigirFuncion(local.id, "editar_programa");
  if (bloqueo) return { error: bloqueo };
  if ((latitud === null) !== (longitud === null)) return { error: "Cargá latitud y longitud juntas (o dejá las dos vacías)." };
  if (latitud !== null && (!Number.isFinite(latitud) || latitud < -90 || latitud > 90)) return { error: "La latitud tiene que estar entre -90 y 90." };
  if (longitud !== null && (!Number.isFinite(longitud) || longitud < -180 || longitud > 180)) return { error: "La longitud tiene que estar entre -180 y 180." };

  const { error } = await admin
    .from("locales")
    .update({
      nombre,
      rubro,
      minutos_entre_puntos: Math.round(horas * 60),
      termino_personal: termino,
      latitud,
      longitud,
    })
    .eq("id", local.id);
  if (error) return { error: "No se pudo guardar." };
  after(() => notificarCambioLocal(local.id)); // clase de Google y pases de Apple (nombre, ubicación)
  refresh();
  return { ok: Date.now() };
}
