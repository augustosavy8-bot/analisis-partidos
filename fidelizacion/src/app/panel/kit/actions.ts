"use server";

import { redirect } from "next/navigation";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { requerirUsuario } from "@/lib/panel";
import { comercioDelUsuario } from "@/lib/facturacion/comercio";
import { crearPreferenciaMp } from "@/lib/facturacion/mp";
import { mensajeMotivoPedido, validarDireccion } from "@/lib/facturacion/pedido";
import { resumenErrorMp } from "@/lib/facturacion/errores-mp";

export type EstadoPedido = { error?: string };

/**
 * Arma el pedido (reserva el stock en la base, con precios de la base) y manda
 * al comercio a pagar a Mercado Pago. El navegador sólo manda cantidades.
 */
export async function crearPedidoKit(comercioId: string, _prev: EstadoPedido, form: FormData): Promise<EstadoPedido> {
  const { email } = await requerirUsuario();
  const comercio = await comercioDelUsuario(comercioId);
  if (!comercio) return { error: "No encontramos tu comercio." };

  const items = ["kit_inicial", "chip"]
    .map((codigo) => ({ codigo, cantidad: Number(form.get(`cantidad_${codigo}`) ?? 0) }))
    .filter((i) => Number.isInteger(i.cantidad) && i.cantidad > 0);
  if (items.length === 0) return { error: "Elegí al menos un producto." };

  const entrega = form.get("entrega") === "envio" ? "envio" : "retiro";
  let direccion = null;
  if (entrega === "envio") {
    const d = validarDireccion(Object.fromEntries(["nombre", "telefono", "calle", "numero", "piso", "ciudad", "provincia", "cp"].map((k) => [k, form.get(k)])));
    if (!d.ok) return { error: d.error };
    direccion = d.direccion;
  }

  const admin = crearClienteAdmin();
  const { data: r, error } = await admin.rpc("crear_pedido", {
    p_comercio_id: comercio.id,
    p_items: items,
    p_entrega: entrega,
    p_direccion: direccion,
  });
  if (error || !r) {
    console.error("crear_pedido", comercio.id, error?.message);
    return { error: "No pudimos armar el pedido. Probá de nuevo." };
  }
  if (!r.ok) return { error: mensajeMotivoPedido(r.motivo) };

  const pedidoId: string = r.pedido_id;
  const { data: pedido } = await admin
    .from("pedidos")
    .select("numero, costo_envio_centavos, reserva_hasta, pedido_items(cantidad, precio_unitario_centavos, productos(codigo, nombre))")
    .eq("id", pedidoId)
    .single();

  let destino: string | undefined;
  try {
    if (!pedido) throw new Error("pedido recién creado no encontrado");
    const filas = pedido.pedido_items as unknown as { cantidad: number; precio_unitario_centavos: number; productos: { codigo: string; nombre: string } }[];
    const pref = await crearPreferenciaMp({
      pedidoId,
      numero: pedido.numero,
      items: filas.map((f) => ({ codigo: f.productos.codigo, nombre: f.productos.nombre, cantidad: f.cantidad, precioCentavos: f.precio_unitario_centavos })),
      envioCentavos: pedido.costo_envio_centavos,
      email: comercio.email_facturacion ?? email ?? null,
      reservaHasta: pedido.reserva_hasta!,
    });
    if (!pref.id || !pref.init_point) throw new Error("Mercado Pago no devolvió el link de pago");
    await admin.from("pedidos").update({ mp_preference_id: pref.id }).eq("id", pedidoId);
    destino = pref.init_point;
  } catch (e) {
    // Sin link de pago no tiene sentido retener el stock.
    await admin.rpc("cancelar_pedido_impago", { p_pedido_id: pedidoId });
    console.error("Preferencia del kit fallida", comercio.id, resumenErrorMp(e));
    return { error: "Mercado Pago no respondió. Probá de nuevo en un momento." };
  }
  redirect(destino);
}
