"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { requerirLocal } from "@/lib/panel";
import { exigirFuncion } from "@/lib/facturacion/acceso-servidor";
import { notificarCambioTarjeta } from "@/lib/wallet";

export async function eliminarCliente(slug: string, clienteId: string): Promise<{ error?: string }> {
  const { db, local } = await requerirLocal(slug);
  const { data, error } = await db.rpc("eliminar_cliente_de_local", { p_local_id: local.id, p_cliente_id: clienteId });
  if (error || !data?.ok) return { error: "No se pudo eliminar el cliente." };
  refresh();
  return {};
}

/** Club de socios: hacer socio o quitar del club a mano (el toque del llavero de socios lo hace solo). */
export async function cambiarSocio(slug: string, clienteId: string, socio: boolean): Promise<{ error?: string }> {
  const { db, local } = await requerirLocal(slug);
  const bloqueo = await exigirFuncion(local.id, "editar_programa");
  if (bloqueo) return { error: bloqueo };
  const { data: serial, error } = await db.rpc("panel_cambiar_socio", { p_local_id: local.id, p_cliente_id: clienteId, p_socio: socio });
  if (error) return { error: "No se pudo cambiar. Probá de nuevo." };
  // La tarjeta cambia de colores e insignia: se actualiza en las billeteras.
  if (serial) after(() => notificarCambioTarjeta(serial));
  refresh();
  return {};
}
