"use server";

import { refresh } from "next/cache";
import { requerirLocal } from "@/lib/panel";

export async function eliminarCliente(slug: string, clienteId: string): Promise<{ error?: string }> {
  const { db, local } = await requerirLocal(slug);
  const { data, error } = await db.rpc("eliminar_cliente_de_local", { p_local_id: local.id, p_cliente_id: clienteId });
  if (error || !data?.ok) return { error: "No se pudo eliminar el cliente." };
  refresh();
  return {};
}
