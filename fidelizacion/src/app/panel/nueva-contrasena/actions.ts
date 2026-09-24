"use server";

import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

export type EstadoNueva = { error?: string };

export async function cambiarContraseña(_prev: EstadoNueva, form: FormData): Promise<EstadoNueva> {
  const password = String(form.get("password") ?? "");
  const repetida = String(form.get("repetida") ?? "");
  if (password.length < 8) return { error: "Usá al menos 8 caracteres." };
  if (password !== repetida) return { error: "Las contraseñas no coinciden." };
  const db = await crearClienteServidor();
  const { error } = await db.auth.updateUser({ password });
  if (error) return { error: error.message.includes("different") ? "Tiene que ser distinta de la anterior." : "No se pudo cambiar. Probá de nuevo." };
  redirect("/panel");
}
