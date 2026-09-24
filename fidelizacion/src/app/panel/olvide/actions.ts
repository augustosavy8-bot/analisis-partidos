"use server";

import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export type EstadoOlvide = { enviado?: boolean; error?: string };

export async function pedirLink(_prev: EstadoOlvide, form: FormData): Promise<EstadoOlvide> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email inválido." };

  // Flujo "implicit": el link del mail trae la sesión en la URL, así funciona aunque
  // se abra en otro navegador (p. ej. la app de Gmail). Con PKCE sólo funcionaba
  // en el mismo navegador donde se pidió.
  const db = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false },
  });
  await db.auth.resetPasswordForEmail(email, { redirectTo: `${env.appUrl}/auth/recuperar` });
  // Siempre la misma respuesta: no revelamos si el email existe.
  return { enviado: true };
}
