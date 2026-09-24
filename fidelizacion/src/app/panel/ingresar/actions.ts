"use server";

import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

export type EstadoIngreso = { error?: string; email?: string };

export async function ingresar(_prev: EstadoIngreso, form: FormData): Promise<EstadoIngreso> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Completá email y contraseña.", email };

  const db = await crearClienteServidor();
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email o contraseña incorrectos.", email };
  redirect("/panel");
}

export async function salir() {
  const db = await crearClienteServidor();
  await db.auth.signOut();
  redirect("/panel/ingresar");
}
