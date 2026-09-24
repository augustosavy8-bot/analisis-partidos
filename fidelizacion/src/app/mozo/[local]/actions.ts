"use server";

import { redirect } from "next/navigation";
import { buscarLocal } from "@/lib/locales";
import { ingresarMozo, salirMozo } from "@/lib/sesion-mozo";

export type EstadoLogin = { error?: string; mozoId?: string };

export async function ingresar(_prev: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const slug = String(form.get("l") ?? "");
  const mozoId = String(form.get("mozo") ?? "");
  const pin = String(form.get("pin") ?? "").trim();
  const local = await buscarLocal(slug);
  if (!local) return { error: "Local inexistente." };
  if (!mozoId) return { error: "Elegí quién sos." };
  if (!/^\d{4,6}$/.test(pin)) return { error: "El PIN tiene entre 4 y 6 números.", mozoId };

  const r = await ingresarMozo(mozoId, pin, local);
  if (!r.ok) return { error: r.error, mozoId };
  redirect(`/mozo/${slug}`);
}

export async function salir(slug: string) {
  await salirMozo();
  redirect(`/mozo/${slug}`);
}
