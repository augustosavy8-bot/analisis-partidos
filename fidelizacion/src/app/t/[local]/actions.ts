"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { buscarLocal } from "@/lib/locales";
import { clienteActual } from "@/lib/sesion-cliente";
import { guardarCumpleCliente, MINUTOS_CANJE_AL_TOQUE } from "@/lib/tarjeta";
import { leerCumple } from "@/lib/promos";

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
  // Si acaban de apoyar el llavero, se canjea en el momento (un toque, una pestaña).
  const { data: alToque } = await db.rpc("canjear_con_toque", {
    p_tarjeta_id: tarjeta.id,
    p_premio_id: premioId,
    p_minutos: MINUTOS_CANJE_AL_TOQUE,
  });
  if (alToque?.ok) redirect(`/t/${slug}?m=${alToque.movimiento_id}`);
  if (alToque && alToque.motivo !== "sin_toque") redirect(`/aviso?m=${alToque.motivo}`);

  // Si no, queda pendiente hasta el próximo toque.
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

export type EstadoCumple = { error?: string; ok?: boolean };

export async function guardarCumple(slug: string, _prev: EstadoCumple, form: FormData): Promise<EstadoCumple> {
  const cliente = await clienteActual();
  if (!cliente) redirect(`/t/${slug}`);
  const cumple = leerCumple(form);
  if (!cumple || cumple === "invalido") return { error: "Elegí un día y un mes válidos." };
  if (!(await guardarCumpleCliente(cliente.clienteId, cumple.dia, cumple.mes))) {
    return { error: "Tu cumple ya estaba cargado." };
  }
  refresh();
  return { ok: true };
}
