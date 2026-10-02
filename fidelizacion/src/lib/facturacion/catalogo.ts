import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { leerLimites, type LimitesPlan } from "./planes";

export type PlanPublico = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  precioCentavos: number;
  /** Precio "de lista" que se muestra tachado (promo). null = sin promo. */
  precioListaCentavos: number | null;
  /** Texto del cartel de promo ("Precio de lanzamiento"). */
  promoTexto: string | null;
  diasPrueba: number;
  limites: LimitesPlan;
  /** El plan recomendado (se muestra marcado y elegido por defecto). */
  destacado: boolean;
};

export type ProductoPublico = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  precioCentavos: number;
  chipsPorUnidad: number;
  stock: number;
  maxPorPedido: number;
};

export type ConfigFacturacion = {
  costoEnvioCentavos: number;
  minutosReservaStock: number;
  diasGracia: number;
  diasSumarTrasGracia: number;
  direccionRetiro: string;
};

/** Planes activos, en el orden de la página de precios. */
export async function planesPublicos(): Promise<PlanPublico[]> {
  const { data, error } = await crearClienteAdmin()
    .from("planes")
    .select("id, codigo, nombre, descripcion, precio_centavos, precio_lista_centavos, promo_texto, dias_prueba, limites, destacado")
    .eq("activo", true)
    .order("orden");
  if (error) throw new Error(`No se pudieron leer los planes: ${error.message}`);
  return (data ?? []).map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    descripcion: p.descripcion,
    precioCentavos: p.precio_centavos,
    // Sólo si de verdad es más alto que el precio real (si no, el tachado mentiría).
    precioListaCentavos: p.precio_lista_centavos && p.precio_lista_centavos > p.precio_centavos ? p.precio_lista_centavos : null,
    promoTexto: p.promo_texto,
    diasPrueba: p.dias_prueba,
    limites: leerLimites(p.limites),
    destacado: p.destacado,
  }));
}

export async function productosPublicos(): Promise<ProductoPublico[]> {
  const { data, error } = await crearClienteAdmin()
    .from("productos")
    .select("id, codigo, nombre, descripcion, precio_centavos, chips_por_unidad, stock, max_por_pedido")
    .eq("activo", true)
    .order("orden");
  if (error) throw new Error(`No se pudieron leer los productos: ${error.message}`);
  return (data ?? []).map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    descripcion: p.descripcion,
    precioCentavos: p.precio_centavos,
    chipsPorUnidad: p.chips_por_unidad,
    stock: p.stock,
    maxPorPedido: p.max_por_pedido,
  }));
}

export async function configFacturacion(): Promise<ConfigFacturacion> {
  const { data, error } = await crearClienteAdmin()
    .from("config_facturacion")
    .select("costo_envio_centavos, minutos_reserva_stock, dias_gracia, dias_sumar_tras_gracia, direccion_retiro")
    .single();
  if (error || !data) throw new Error(`No se pudo leer la configuración de facturación: ${error?.message}`);
  return {
    costoEnvioCentavos: data.costo_envio_centavos,
    minutosReservaStock: data.minutos_reserva_stock,
    diasGracia: data.dias_gracia,
    diasSumarTrasGracia: data.dias_sumar_tras_gracia,
    direccionRetiro: data.direccion_retiro,
  };
}
