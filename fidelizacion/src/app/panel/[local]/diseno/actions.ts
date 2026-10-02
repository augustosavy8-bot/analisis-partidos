"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { requerirLocal } from "@/lib/panel";
import { exigirFuncion } from "@/lib/facturacion/acceso-servidor";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { actualizarDisenoLocal } from "@/lib/wallet";
import { HEX_COLOR } from "@/lib/colores";
import { LIMITES_TEXTO } from "@/lib/diseno-tarjeta";
import {
  CONTENT_TYPE,
  TIPOS_IMAGEN,
  medidasImagen,
  pathBorrador,
  pathImagen,
  pathsPosibles,
  validarImagen,
  type TipoImagen,
} from "@/lib/imagenes-local";

const BUCKET = "logos";
const COLUMNA: Record<TipoImagen, "logo_url" | "icono_url" | "franja_url"> = { logo: "logo_url", icono: "icono_url", franja: "franja_url" };

export type EstadoBorrador = { error?: string; ok?: number };

/**
 * Sube la imagen elegida como borrador ({local_id}/borrador/…). No cambia la
 * tarjeta: eso pasa recién al tocar "Guardar y actualizar tarjetas".
 */
export async function subirBorrador(slug: string, tipo: TipoImagen, form: FormData): Promise<EstadoBorrador> {
  if (!TIPOS_IMAGEN.includes(tipo)) return { error: "Tipo de imagen inválido." };
  const { local } = await requerirLocal(slug);
  const bloqueo = (await exigirFuncion(local.id, "editar_programa")) ?? (await exigirFuncion(local.id, "diseno_personalizado"));
  if (bloqueo) return { error: bloqueo };
  const archivo = form.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elegí un archivo." };
  const datos = new Uint8Array(await archivo.arrayBuffer());
  const error = validarImagen(tipo, datos);
  if (error) return { error };
  const { formato } = medidasImagen(datos)!;

  const storage = crearClienteAdmin().storage.from(BUCKET);
  await storage.remove(pathsPosibles(local.id, tipo, true)); // el borrador anterior, en cualquier formato
  const { error: e } = await storage.upload(pathBorrador(local.id, tipo, formato), datos, { contentType: CONTENT_TYPE[formato], upsert: true, cacheControl: "60" });
  if (e) {
    console.error("Diseño: no se pudo subir el borrador", local.id, tipo, e.message);
    return { error: "No se pudo subir la imagen. Probá de nuevo." };
  }
  return { ok: Date.now() };
}

export type EstadoDiseno = { error?: string; ok?: number };

/** Pasa el borrador a su lugar definitivo (revalidándolo) y devuelve la URL pública versionada. */
async function publicarBorrador(localId: string, tipo: TipoImagen): Promise<string | { error: string }> {
  const storage = crearClienteAdmin().storage.from(BUCKET);
  let datos: Uint8Array | null = null;
  for (const path of pathsPosibles(localId, tipo, true)) {
    const { data } = await storage.download(path);
    if (data) {
      datos = new Uint8Array(await data.arrayBuffer());
      break;
    }
  }
  if (!datos) return { error: "No encontramos la imagen que elegiste. Volvé a elegirla." };
  const error = validarImagen(tipo, datos);
  if (error) return { error };
  const { formato } = medidasImagen(datos)!;
  const destino = pathImagen(localId, tipo, formato);
  const { error: e } = await storage.upload(destino, datos, { contentType: CONTENT_TYPE[formato], upsert: true, cacheControl: "3600" });
  if (e) return { error: "No se pudo guardar la imagen. Probá de nuevo." };
  await storage.remove([...pathsPosibles(localId, tipo).filter((p) => p !== destino), ...pathsPosibles(localId, tipo, true)]);
  // ?v= para que las cachés (CDN, Google, pases) tomen la versión nueva.
  return `${storage.getPublicUrl(destino).data.publicUrl}?v=${Date.now()}`;
}

export async function guardarDiseno(slug: string, _prev: EstadoDiseno, form: FormData): Promise<EstadoDiseno> {
  const { local } = await requerirLocal(slug);
  const bloqueo = await exigirFuncion(local.id, "editar_programa");
  if (bloqueo) return { error: bloqueo };
  const color = (k: string) => String(form.get(k) ?? "").trim().toLowerCase();
  const fondo = color("color_fondo");
  const texto = color("color_texto");
  const etiqueta = color("color_etiqueta");
  const acento = color("color_acento");
  const programa = String(form.get("nombre_programa") ?? "").trim().replace(/\s+/g, " ");
  const dorso = String(form.get("texto_dorso") ?? "").trim().replace(/\r\n/g, "\n");

  if (![fondo, texto, etiqueta, acento].every((c) => HEX_COLOR.test(c))) return { error: "Elegí colores válidos." };
  if (programa && (programa.length < 2 || programa.length > LIMITES_TEXTO.programa)) {
    return { error: `El nombre del programa va de 2 a ${LIMITES_TEXTO.programa} caracteres.` };
  }
  if (dorso.length > LIMITES_TEXTO.dorso) return { error: `El texto del dorso tiene hasta ${LIMITES_TEXTO.dorso} caracteres.` };

  const cambios: Record<string, string | null> = {
    color_primario: fondo,
    color_secundario: acento,
    color_texto: texto,
    color_etiqueta: etiqueta,
    // Igual al nombre del local = sin nombre propio (sigue al local si lo renombran).
    nombre_programa: programa && programa !== local.nombre ? programa : null,
    texto_dorso: dorso || null,
  };

  const storage = crearClienteAdmin().storage.from(BUCKET);
  for (const tipo of TIPOS_IMAGEN) {
    const accion = String(form.get(`imagen_${tipo}`) ?? "igual");
    if (accion === "borrador") {
      // Una imagen subida estando en Pro no se publica si después bajó de plan.
      const sinDiseno = await exigirFuncion(local.id, "diseno_personalizado");
      if (sinDiseno) return { error: sinDiseno };
      const r = await publicarBorrador(local.id, tipo);
      if (typeof r !== "string") return r;
      cambios[COLUMNA[tipo]] = r;
    } else if (accion === "quitar") {
      cambios[COLUMNA[tipo]] = null;
      // Sólo borramos lo que está en la carpeta del local (un logo viejo puede estar en otro lado).
      await storage.remove(pathsPosibles(local.id, tipo));
    }
  }

  const { error } = await crearClienteAdmin().from("locales").update(cambios).eq("id", local.id);
  if (error) {
    console.error("Diseño: no se pudo guardar", local.id, error.message);
    return { error: "No se pudo guardar el diseño. Probá de nuevo." };
  }
  after(() => actualizarDisenoLocal(local.id)); // Google: clase + objetos; Apple: updated_at + push
  refresh();
  return { ok: Date.now() };
}
