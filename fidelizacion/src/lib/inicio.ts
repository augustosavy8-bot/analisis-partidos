import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { tarjetasDelCliente } from "@/lib/app/servidor";
import { contraste, mezclar } from "@/lib/colores";
import { cuandoRelativo } from "@/lib/cuando";
import { textoMovimiento, tituloMovimiento, type MotivoMovimiento, type TipoMovimiento } from "@/lib/movimientos";

/** Una tarjeta del home (lo justo para dibujarla del lado del cliente). */
export type TarjetaInicio = {
  slug: string;
  nombre: string;
  logo: string | null;
  puntos: number;
  /** Puntos del próximo premio (null = el local todavía no cargó premios). */
  meta: number | null;
  premio: string | null;
  /** Gradiente con el color del bar (de claro a oscuro), texto y barra de progreso. */
  c1: string;
  c2: string;
  texto: string;
  acento: string;
};

export type MovimientoInicio = { id: string; tipo: TipoMovimiento; titulo: string; negocio: string; cuando: string; puntos: number };

type FilaMovimiento = {
  id: string;
  tipo: TipoMovimiento;
  puntos: number;
  motivo: MotivoMovimiento;
  detalle: string | null;
  created_at: string;
  tarjetas: { locales: { nombre: string; zona_horaria: string } | null } | null;
};

/** Home del cliente: todas sus tarjetas (más puntos primero) y sus últimos movimientos en cualquier local. */
export async function datosInicio(clienteId: string): Promise<{ tarjetas: TarjetaInicio[]; movimientos: MovimientoInicio[] }> {
  const [resumen, { data: movs }] = await Promise.all([
    tarjetasDelCliente(clienteId),
    crearClienteAdmin()
      .from("movimientos")
      .select("id, tipo, puntos, motivo, detalle, created_at, tarjetas!inner(cliente_id, locales(nombre, zona_horaria))")
      .eq("tarjetas.cliente_id", clienteId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const tarjetas = resumen.map(({ local, puntos, proximo }) => {
    const { fondo, texto, acento } = local.colores;
    return {
      slug: local.slug,
      nombre: local.nombre,
      logo: local.logo,
      puntos,
      meta: proximo?.puntos ?? null,
      premio: proximo?.nombre ?? null,
      c1: mezclar(fondo, "#ffffff", 0.14),
      c2: mezclar(fondo, "#000000", 0.3),
      texto,
      // La barra tiene que verse sobre el fondo; si el acento se pierde, va el color del texto.
      acento: contraste(acento, fondo) >= 1.6 ? acento : texto,
    };
  });

  const ahora = new Date();
  const movimientos = ((movs ?? []) as unknown as FilaMovimiento[]).map((m) => {
    const local = m.tarjetas?.locales;
    return {
      id: m.id,
      tipo: m.tipo,
      titulo: m.tipo === "suma" ? textoMovimiento(m) : tituloMovimiento(m),
      negocio: local?.nombre ?? "",
      cuando: cuandoRelativo(m.created_at, local?.zona_horaria ?? "America/Argentina/Buenos_Aires", ahora),
      puntos: m.puntos,
    };
  });

  return { tarjetas, movimientos };
}
