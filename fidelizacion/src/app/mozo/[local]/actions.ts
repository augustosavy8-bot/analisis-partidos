"use server";

import { redirect } from "next/navigation";
import { buscarLocal } from "@/lib/locales";
import { ingresarMozo, ingresarMozoDesdePanel, salirMozo } from "@/lib/sesion-mozo";
import { gestionaLocal } from "@/lib/panel";
import { crearClienteAdmin } from "@/lib/supabase/admin";

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

/** Dueños y encargados con el panel abierto: eligen quién atiende y entran sin PIN. */
export async function entrarDesdePanel(slug: string, mozoId: string) {
  const local = await buscarLocal(slug);
  if (!local || !(await gestionaLocal(slug))) redirect(`/mozo/${slug}`);
  const { data: mozo } = await crearClienteAdmin()
    .from("mozos")
    .select("id, nombre")
    .eq("id", mozoId)
    .eq("local_id", local.id)
    .eq("activo", true)
    .maybeSingle();
  if (mozo) await ingresarMozoDesdePanel(mozo, local);
  redirect(`/mozo/${slug}`);
}

export async function salir(slug: string) {
  await salirMozo();
  redirect(`/mozo/${slug}`);
}
