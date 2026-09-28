"use server";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { normalizarWhatsapp } from "@/lib/whatsapp";
import { RUBROS } from "@/lib/interes";

export type EstadoInteres = { ok?: boolean; error?: string; valores?: Record<string, string> };

/** Guarda los datos de un dueño interesado en sumar su local a Point. */
export async function registrarInteres(_prev: EstadoInteres, form: FormData): Promise<EstadoInteres> {
  const campo = (n: string) => String(form.get(n) ?? "").trim().replace(/\s+/g, " ");
  const valores = {
    nombre: campo("nombre"),
    local: campo("local"),
    rubro: campo("rubro"),
    ciudad: campo("ciudad"),
    whatsapp: campo("whatsapp"),
    mensaje: String(form.get("mensaje") ?? "").trim(),
  };

  // Campo trampa: los bots lo completan, las personas no lo ven.
  if (campo("sitio")) return { ok: true };

  if (valores.nombre.length < 2 || valores.nombre.length > 80) return { error: "Poné tu nombre.", valores };
  if (valores.local.length < 2 || valores.local.length > 80) return { error: "Poné el nombre de tu local.", valores };
  if (!RUBROS.includes(valores.rubro)) return { error: "Elegí el rubro.", valores };
  if (valores.ciudad.length > 60) return { error: "La ciudad es muy larga.", valores };
  if (valores.mensaje.length > 500) return { error: "El mensaje es muy largo (máx. 500).", valores };
  const whatsapp = normalizarWhatsapp(valores.whatsapp);
  if (!whatsapp) return { error: "Revisá el WhatsApp (con código de área).", valores };

  const { error } = await crearClienteAdmin()
    .from("interesados")
    .insert({ ...valores, ciudad: valores.ciudad || null, mensaje: valores.mensaje || null, whatsapp });
  if (error) return { error: "No se pudo enviar. Probá de nuevo en un rato.", valores };
  return { ok: true };
}
