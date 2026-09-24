"use server";

import { crearClienteServidor } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export type EstadoOlvide = { enviado?: boolean; error?: string };

export async function pedirLink(_prev: EstadoOlvide, form: FormData): Promise<EstadoOlvide> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email inválido." };
  const db = await crearClienteServidor();
  await db.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.appUrl}/auth/callback?next=/panel/nueva-contrasena`,
  });
  // Siempre la misma respuesta: no revelamos si el email existe.
  return { enviado: true };
}
