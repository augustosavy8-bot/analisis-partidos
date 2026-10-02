"use server";

import { refresh } from "next/cache";
import { requerirSuperadmin } from "@/lib/admin";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { obtenerPagoMp, reembolsarPagoMp } from "@/lib/facturacion/mp";
import { procesarEventoGuardado, procesarPreapproval } from "@/lib/facturacion/webhooks";
import { resumenErrorMp } from "@/lib/facturacion/errores-mp";
import { leerPesos } from "@/lib/facturacion/dinero";
import { conciliar } from "@/lib/facturacion/conciliacion";

export type EstadoAdmin = { ok?: string; error?: string };

// ---------------------------------------------------------------- suscripciones

/** Vuelve a consultar la suscripción a MP y aplica lo que diga (como un webhook). */
export async function sincronizarSuscripcion(mpPreapprovalId: string): Promise<EstadoAdmin> {
  await requerirSuperadmin();
  try {
    const r = await procesarPreapproval(mpPreapprovalId);
    refresh();
    return { ok: r };
  } catch (e) {
    return { error: resumenErrorMp(e) };
  }
}

/** Dar o editar una cortesía (plan sin cargo, fin opcional). */
export async function guardarCortesia(comercioId: string, _prev: EstadoAdmin, form: FormData): Promise<EstadoAdmin> {
  const { userId } = await requerirSuperadmin();
  const db = crearClienteAdmin();
  const { data: plan } = await db.from("planes").select("id").eq("codigo", String(form.get("plan") ?? "")).maybeSingle();
  if (!plan) return { error: "Elegí un plan." };
  const hastaTxt = String(form.get("hasta") ?? "").trim();
  let hasta: string | null = null;
  if (hastaTxt) {
    // Fin del día elegido, hora de Argentina.
    const d = new Date(`${hastaTxt}T23:59:59-03:00`);
    if (Number.isNaN(d.getTime()) || d.getTime() < Date.now()) return { error: "La fecha de fin tiene que ser futura." };
    hasta = d.toISOString();
  }
  const { data, error } = await db.rpc("admin_set_cortesia", { p_comercio_id: comercioId, p_plan_id: plan.id, p_hasta: hasta, p_actor: userId });
  if (error) return { error: error.message };
  if (data === "tiene_suscripcion_paga") return { error: "Tiene una suscripción paga vigente: primero hay que cancelarla." };
  refresh();
  return { ok: data === "creada" ? "Cortesía otorgada." : "Cortesía actualizada." };
}

/** Horas entre mensajes de un local (0 = sin límite). Sólo el superadmin lo cambia. */
export async function guardarHorasMensajes(localId: string, _prev: EstadoAdmin, form: FormData): Promise<EstadoAdmin> {
  await requerirSuperadmin();
  const horas = Number(form.get("horas"));
  if (!Number.isInteger(horas) || horas < 0 || horas > 720) return { error: "Entre 0 y 720 horas." };
  const { error } = await crearClienteAdmin().from("locales").update({ horas_entre_mensajes: horas }).eq("id", localId);
  if (error) return { error: error.message };
  refresh();
  return { ok: horas === 0 ? "Sin límite de mensajes." : `Un mensaje cada ${horas} h.` };
}

// ---------------------------------------------------------------- pedidos

export async function avanzarPedido(pedidoId: string, estado: string): Promise<EstadoAdmin> {
  await requerirSuperadmin();
  const { data, error } = await crearClienteAdmin().rpc("admin_estado_pedido", { p_pedido_id: pedidoId, p_estado: estado });
  if (error) return { error: error.message };
  if (data !== "ok") return { error: "Ese cambio de estado no es válido para este pedido." };
  refresh();
  return { ok: "Pedido actualizado." };
}

/**
 * Reembolso total: primero en MP (que es quien devuelve la plata), después en la
 * base. Si el pedido no se despachó, el stock vuelve.
 */
export async function reembolsarPedido(pedidoId: string, devolverStock: boolean): Promise<EstadoAdmin> {
  await requerirSuperadmin();
  const db = crearClienteAdmin();
  const { data: pago } = await db
    .from("pagos")
    .select("mp_payment_id, estado")
    .eq("pedido_id", pedidoId)
    .eq("estado", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!pago) return { error: "Este pedido no tiene un pago aprobado." };
  try {
    await reembolsarPagoMp(pago.mp_payment_id);
  } catch (e) {
    return { error: `Mercado Pago no hizo el reembolso: ${resumenErrorMp(e)}` };
  }
  const { data, error } = await db.rpc("admin_reembolso_pedido", { p_pedido_id: pedidoId, p_mp_payment_id: pago.mp_payment_id, p_devolver_stock: devolverStock });
  if (error || data !== "ok") return { error: `Reembolsado en MP, pero no se pudo marcar el pedido: ${error?.message ?? data}` };
  refresh();
  return { ok: "Reembolso hecho." };
}

/** Consulta un pago a MP por id (soporte: "pagué y no se acreditó"). */
export async function consultarPago(_prev: EstadoAdmin, form: FormData): Promise<EstadoAdmin> {
  await requerirSuperadmin();
  const id = String(form.get("payment_id") ?? "").trim();
  if (!/^\d{1,20}$/.test(id)) return { error: "Poné el número de operación de MP." };
  try {
    const p = await obtenerPagoMp(id);
    return { ok: `Pago ${p.id}: ${p.status} (${p.status_detail}) · $${p.transaction_amount} · ref ${p.external_reference ?? "—"} · ${p.date_approved ?? p.date_created}` };
  } catch (e) {
    return { error: resumenErrorMp(e) };
  }
}

// ---------------------------------------------------------------- eventos

export async function reprocesarEvento(eventoId: number): Promise<EstadoAdmin> {
  await requerirSuperadmin();
  const r = await procesarEventoGuardado(eventoId);
  refresh();
  return r.ok ? { ok: r.resultado } : { error: r.resultado };
}

/** Corre la conciliación diaria a mano. */
export async function correrConciliacion(): Promise<EstadoAdmin> {
  await requerirSuperadmin();
  const r = await conciliar();
  refresh();
  const resumen = `Reservas liberadas: ${r.reservasLiberadas} · planes aplicados: ${r.planesAplicados} · suscripciones: ${r.suscripcionesRevisadas} · pedidos: ${r.pedidosRevisados} · eventos: ${r.eventosReprocesados}`;
  return r.errores.length ? { error: `${resumen}. Errores: ${r.errores.join(" | ")}` } : { ok: resumen };
}

// ---------------------------------------------------------------- catálogo

const LIMITE = (v: FormDataEntryValue | null) => {
  const t = String(v ?? "").trim();
  if (t === "" || t.toLowerCase() === "ilimitado") return null;
  const n = Number(t);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
};

/**
 * Editar un plan. Si cambia el precio o la prueba, se descarta el plan de MP
 * guardado: el próximo alta crea uno nuevo con los valores nuevos. Los que ya
 * están suscriptos siguen pagando lo que pactaron (MP no les cambia el monto).
 */
export async function guardarPlan(planId: string, _prev: EstadoAdmin, form: FormData): Promise<EstadoAdmin> {
  await requerirSuperadmin();
  const db = crearClienteAdmin();
  const nombre = String(form.get("nombre") ?? "").trim();
  const precio = leerPesos(String(form.get("precio") ?? ""));
  const dias = Number(form.get("dias_prueba"));
  const limites = {
    locales: LIMITE(form.get("locales")),
    clientes: LIMITE(form.get("clientes")),
    premios: LIMITE(form.get("premios")),
    promos: form.get("promos") === "on",
    mensajes: form.get("mensajes") === "on",
    estadisticas: form.get("estadisticas") === "avanzadas" ? "avanzadas" : "basicas",
    diseno: form.get("diseno") === "on",
  };
  if (nombre.length < 2 || nombre.length > 40) return { error: "Nombre entre 2 y 40 letras." };
  if (precio === null || precio <= 0) return { error: "Precio inválido." };
  if (!Number.isInteger(dias) || dias < 0 || dias > 90) return { error: "Días de prueba entre 0 y 90." };
  if ([limites.locales, limites.clientes, limites.premios].some((x) => Number.isNaN(x))) return { error: "Límites: un número o vacío (= ilimitado)." };

  const { data: actual } = await db.from("planes").select("precio_centavos, dias_prueba").eq("id", planId).single();
  if (!actual) return { error: "Plan inexistente." };
  const cambiaMp = actual.precio_centavos !== precio || actual.dias_prueba !== dias;
  const { error } = await db
    .from("planes")
    .update({
      nombre,
      precio_centavos: precio,
      dias_prueba: dias,
      limites,
      activo: form.get("activo") === "on",
      destacado: form.get("destacado") === "on",
      ...(cambiaMp ? { mp_preapproval_plan_id: null } : {}),
    })
    .eq("id", planId);
  if (error) return { error: error.message };
  refresh();
  return { ok: cambiaMp ? "Guardado. Las altas nuevas usan el precio nuevo; los suscriptos actuales mantienen el suyo." : "Guardado." };
}

export async function guardarProducto(productoId: string, _prev: EstadoAdmin, form: FormData): Promise<EstadoAdmin> {
  await requerirSuperadmin();
  const nombre = String(form.get("nombre") ?? "").trim();
  const descripcion = String(form.get("descripcion") ?? "").trim() || null;
  const precio = leerPesos(String(form.get("precio") ?? ""));
  const stock = Number(form.get("stock"));
  const max = Number(form.get("max_por_pedido"));
  if (nombre.length < 2 || nombre.length > 60) return { error: "Nombre entre 2 y 60 letras." };
  if (descripcion && descripcion.length > 200) return { error: "Descripción de hasta 200 caracteres." };
  if (precio === null || precio <= 0) return { error: "Precio inválido." };
  if (!Number.isInteger(stock) || stock < 0) return { error: "Stock inválido." };
  if (!Number.isInteger(max) || max < 1) return { error: "Máximo por pedido inválido." };
  const { error } = await crearClienteAdmin()
    .from("productos")
    .update({ nombre, descripcion, precio_centavos: precio, stock, max_por_pedido: max, activo: form.get("activo") === "on" })
    .eq("id", productoId);
  if (error) return { error: error.message };
  refresh();
  return { ok: "Guardado. (El stock es el disponible: lo reservado por pedidos impagos ya está descontado.)" };
}

export async function guardarConfig(_prev: EstadoAdmin, form: FormData): Promise<EstadoAdmin> {
  await requerirSuperadmin();
  const envio = leerPesos(String(form.get("envio") ?? ""));
  const reserva = Number(form.get("reserva"));
  const gracia = Number(form.get("gracia"));
  const sumar = Number(form.get("sumar"));
  const direccion = String(form.get("direccion") ?? "").trim();
  if (envio === null) return { error: "Costo de envío inválido." };
  if (!Number.isInteger(reserva) || reserva < 5 || reserva > 1440) return { error: "Reserva entre 5 y 1440 minutos." };
  if (!Number.isInteger(gracia) || gracia < 0 || gracia > 60) return { error: "Gracia entre 0 y 60 días." };
  if (!Number.isInteger(sumar) || sumar < 0 || sumar > 60) return { error: "Días de sumar entre 0 y 60." };
  if (direccion.length < 3 || direccion.length > 200) return { error: "Dirección de retiro inválida." };
  const { error } = await crearClienteAdmin()
    .from("config_facturacion")
    .update({ costo_envio_centavos: envio, minutos_reserva_stock: reserva, dias_gracia: gracia, dias_sumar_tras_gracia: sumar, direccion_retiro: direccion })
    .eq("id", true);
  if (error) return { error: error.message };
  refresh();
  return { ok: "Configuración guardada." };
}

// ---------------------------------------------------------------- arrepentimiento

export async function resolverArrepentimiento(id: string): Promise<EstadoAdmin> {
  await requerirSuperadmin();
  const { error } = await crearClienteAdmin()
    .from("solicitudes_arrepentimiento")
    .update({ estado: "resuelta", resuelta_en: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return { ok: "Marcada como resuelta." };
}
