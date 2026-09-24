"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { COOKIE_DISPOSITIVO, COOKIE_TOQUE, hashToken } from "@/lib/dispositivo";

/** Sólo demo: desvincula este celular para volver a probar el primer toque. */
export async function olvidarCelular() {
  if (!env.permitirModoPrueba) return;
  const store = await cookies();
  const token = store.get(COOKIE_DISPOSITIVO)?.value;
  if (token) {
    await crearClienteAdmin()
      .from("dispositivos")
      .update({ revocado_en: new Date().toISOString() })
      .eq("token_hash", hashToken(token));
  }
  store.delete(COOKIE_DISPOSITIVO);
  store.delete(COOKIE_TOQUE);
  redirect("/demo");
}
