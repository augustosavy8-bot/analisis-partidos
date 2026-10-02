"use server";

import { randomBytes } from "node:crypto";
import { crearClienteAdmin } from "@/lib/supabase/admin";

export type EstadoArrepentimiento = { error?: string; codigo?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Código de trámite corto y fácil de dictar (sin 0/O ni 1/I). */
function codigoTramite() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = randomBytes(6);
  return "ARR-" + Array.from(b, (x) => letras[x % letras.length]).join("");
}

/** Botón de arrepentimiento: sin login, guarda la solicitud y devuelve el código de trámite. */
export async function pedirArrepentimiento(_prev: EstadoArrepentimiento, form: FormData): Promise<EstadoArrepentimiento> {
  if (String(form.get("sitio") ?? "") !== "") return { codigo: codigoTramite() }; // trampa para bots
  const nombre = String(form.get("nombre") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const tipo = form.get("tipo") === "pedido" ? "pedido" : "suscripcion";
  const referencia = String(form.get("referencia") ?? "").trim() || null;
  const motivo = String(form.get("motivo") ?? "").trim() || null;
  if (nombre.length < 2 || nombre.length > 80) return { error: "Poné tu nombre o el de tu comercio." };
  if (!EMAIL.test(email)) return { error: "Revisá el email: ahí te escribimos." };
  if (referencia && referencia.length > 80) return { error: "La referencia es muy larga." };
  if (motivo && motivo.length > 500) return { error: "El comentario es muy largo (máx. 500)." };

  const codigo = codigoTramite();
  const { error } = await crearClienteAdmin().from("solicitudes_arrepentimiento").insert({ codigo, nombre, email, tipo, referencia, motivo });
  if (error) {
    console.error("solicitud de arrepentimiento", error.message);
    return { error: "No pudimos registrar el pedido. Probá de nuevo en un momento." };
  }
  return { codigo };
}
