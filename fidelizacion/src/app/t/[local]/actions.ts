"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { buscarLocal } from "@/lib/locales";
import { clienteActual } from "@/lib/sesion-cliente";

async function tarjetaActual(slug: string) {
  const [local, cliente] = await Promise.all([buscarLocal(slug), clienteActual()]);
  if (!local || !cliente) return null;
  const db = crearClienteAdmin();
  const { data } = await db
    .from("tarjetas")
    .select("id")
    .eq("cliente_id", cliente.clienteId)
    .eq("local_id", local.id)
    .maybeSingle();
  return data;
}

export async function solicitarCanje(slug: string, premioId: string) {
  const tarjeta = await tarjetaActual(slug);
  if (!tarjeta) redirect(`/t/${slug}`);
  const db = crearClienteAdmin();
  const { data } = await db.rpc("solicitar_canje", { p_tarjeta_id: tarjeta.id, p_premio_id: premioId });
  if (!data?.ok) redirect(`/aviso?m=${data?.motivo ?? "error"}`);
  refresh();
}

export async function cancelarCanje(slug: string, canjeId: string) {
  const tarjeta = await tarjetaActual(slug);
  if (!tarjeta) redirect(`/t/${slug}`);
  const db = crearClienteAdmin();
  await db
    .from("canjes")
    .update({ estado: "cancelado", resuelto_en: new Date().toISOString() })
    .eq("id", canjeId)
    .eq("tarjeta_id", tarjeta.id)
    .eq("estado", "pendiente");
  refresh();
}
