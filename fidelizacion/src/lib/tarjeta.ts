import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import type { MotivoMovimiento, TipoMovimiento } from "@/lib/movimientos";
import type { Promo } from "@/lib/promos";

export type Premio = { id: string; nombre: string; descripcion: string | null; puntos_necesarios: number };
export type Movimiento = {
  id: string;
  tipo: TipoMovimiento;
  puntos: number;
  motivo: MotivoMovimiento;
  detalle: string | null;
  origen: "nfc" | "qr";
  created_at: string;
  mozo: string | null;
};
export type CanjePendiente = { id: string; expira_en: string; premio: Premio };

export async function premiosDelLocal(localId: string): Promise<Premio[]> {
  const db = crearClienteAdmin();
  const { data } = await db
    .from("premios")
    .select("id, nombre, descripcion, puntos_necesarios")
    .eq("local_id", localId)
    .eq("activo", true)
    .order("puntos_necesarios")
    .order("orden");
  return data ?? [];
}

export async function promosDelLocal(localId: string): Promise<Promo[]> {
  const db = crearClienteAdmin();
  const { data } = await db
    .from("promos")
    .select("id, nombre, dias, desde, hasta, puntos, activa")
    .eq("local_id", localId)
    .eq("activa", true)
    .order("created_at");
  return data ?? [];
}

/** Cumple del cliente (día y mes), o null si no lo cargó. */
export async function cumpleDelCliente(clienteId: string): Promise<{ dia: number; mes: number } | null> {
  const db = crearClienteAdmin();
  const { data } = await db.from("clientes").select("cumple_dia, cumple_mes").eq("id", clienteId).maybeSingle();
  return data?.cumple_dia && data.cumple_mes ? { dia: data.cumple_dia, mes: data.cumple_mes } : null;
}

export async function tarjetaDelCliente(clienteId: string, localId: string) {
  const db = crearClienteAdmin();
  const { data: tarjeta } = await db
    .from("tarjetas")
    .select("id, puntos, serial, wallet_auth_token, created_at")
    .eq("cliente_id", clienteId)
    .eq("local_id", localId)
    .maybeSingle();
  if (!tarjeta) return null;

  const [{ data: movs }, { data: canje }] = await Promise.all([
    db
      .from("movimientos")
      .select("id, tipo, puntos, motivo, detalle, origen, created_at, mozos(nombre)")
      .eq("tarjeta_id", tarjeta.id)
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("canjes")
      .select("id, expira_en, premios(id, nombre, descripcion, puntos_necesarios)")
      .eq("tarjeta_id", tarjeta.id)
      .eq("estado", "pendiente")
      .gt("expira_en", new Date().toISOString())
      .maybeSingle(),
  ]);

  const movimientos: Movimiento[] = (movs ?? []).map((m) => ({
    id: m.id,
    tipo: m.tipo,
    puntos: m.puntos,
    motivo: m.motivo,
    detalle: m.detalle,
    origen: m.origen,
    created_at: m.created_at,
    mozo: (m.mozos as unknown as { nombre: string } | null)?.nombre ?? null,
  }));

  const canjePendiente: CanjePendiente | null = canje
    ? { id: canje.id, expira_en: canje.expira_en, premio: canje.premios as unknown as Premio }
    : null;

  return { ...tarjeta, movimientos, canjePendiente };
}

/** El próximo premio a alcanzar (o el más caro si ya alcanzó todos). */
export function proximoPremio(premios: Premio[], puntos: number): Premio | null {
  if (!premios.length) return null;
  return premios.find((p) => p.puntos_necesarios > puntos) ?? premios[premios.length - 1];
}

export function formatearHora(iso: string, zona: string) {
  return new Intl.DateTimeFormat("es-AR", { timeZone: zona, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}

export function formatearFecha(iso: string, zona: string) {
  const d = new Date(iso);
  const hoy = new Date();
  const fmt = (x: Date) => new Intl.DateTimeFormat("es-AR", { timeZone: zona, dateStyle: "short" }).format(x);
  const ayer = new Date(hoy.getTime() - 86400000);
  const dia = fmt(d) === fmt(hoy) ? "Hoy" : fmt(d) === fmt(ayer) ? "Ayer" : new Intl.DateTimeFormat("es-AR", { timeZone: zona, day: "numeric", month: "short" }).format(d);
  return `${dia}, ${formatearHora(iso, zona)}`;
}

/** ¿El movimiento ocurrió en los últimos `minutos`? */
export function esReciente(iso: string, minutos = 5) {
  return Date.now() - new Date(iso).getTime() < minutos * 60_000;
}

/** Guarda el cumple del cliente. Sólo se puede cargar una vez (evita cambiarlo para cobrar el regalo). */
export async function guardarCumpleCliente(clienteId: string, dia: number, mes: number): Promise<boolean> {
  const db = crearClienteAdmin();
  const { data, error } = await db
    .from("clientes")
    .update({ cumple_dia: dia, cumple_mes: mes, cumple_cargado_en: new Date().toISOString() })
    .eq("id", clienteId)
    .is("cumple_mes", null)
    .select("id");
  return !error && (data?.length ?? 0) > 0;
}
