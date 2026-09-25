import "server-only";
import { randomUUID } from "node:crypto";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { firmar, verificarFirma } from "@/lib/firmas";
import { env } from "@/lib/env";
import { notificarCambioTarjeta } from "@/lib/wallet";

export type Origen = "nfc" | "qr";

/** Un toque ya validado (chip de prueba, SUN o QR) listo para aplicarse. */
export type Toque = {
  localId: string;
  localSlug: string;
  mozoId: string;
  chipId: string | null;
  origen: Origen;
};

/** Resultado de aplicar un toque a una tarjeta: a dónde mandar al cliente. */
export type ResultadoToque =
  | { tipo: "suma"; movimientoId: string }
  | { tipo: "canje"; movimientoId: string }
  | { tipo: "limite"; proximoEn: string }
  | { tipo: "error"; motivo: string };

/**
 * Aplica un toque a la tarjeta del cliente. Si la tarjeta tiene un canje
 * pendiente, el toque lo confirma; si no, suma 1 punto.
 */
export async function aplicarToque(clienteId: string, toque: Toque): Promise<ResultadoToque> {
  const db = crearClienteAdmin();

  const { data: tarjetaId, error: e1 } = await db.rpc("asegurar_tarjeta", {
    p_cliente_id: clienteId,
    p_local_id: toque.localId,
  });
  if (e1 || !tarjetaId) return { tipo: "error", motivo: "error" };

  const { data: canje } = await db
    .from("canjes")
    .select("id")
    .eq("tarjeta_id", tarjetaId)
    .eq("estado", "pendiente")
    .gt("expira_en", new Date().toISOString())
    .maybeSingle();

  const args = { p_mozo_id: toque.mozoId, p_chip_id: toque.chipId, p_origen: toque.origen };
  const { data: r, error } = canje
    ? await db.rpc("confirmar_canje", { p_canje_id: canje.id, ...args })
    : await db.rpc("registrar_suma", { p_tarjeta_id: tarjetaId, ...args });
  if (error || !r) return { tipo: "error", motivo: "error" };

  // Un toque válido (sumó o sólo chocó con el límite de tiempo) habilita el canje al toque.
  if (!canje && (r.ok || r.motivo === "limite")) {
    await db.rpc("marcar_toque", { p_tarjeta_id: tarjetaId, ...args });
  }

  if (r.ok) {
    const { data: t } = await db.from("tarjetas").select("serial").eq("id", tarjetaId).single();
    if (t) await notificarCambioTarjeta(t.serial);
    return { tipo: canje ? "canje" : "suma", movimientoId: r.movimiento_id };
  }
  if (r.motivo === "limite") return { tipo: "limite", proximoEn: r.proximo_en };
  return { tipo: "error", motivo: r.motivo };
}

/** URL a la que se redirige al cliente según el resultado. */
export function urlResultado(slug: string, r: ResultadoToque): string {
  switch (r.tipo) {
    case "suma":
    case "canje":
      return `/t/${slug}?m=${r.movimientoId}`;
    case "limite":
      return `/t/${slug}?limite=${encodeURIComponent(r.proximoEn)}`;
    default:
      return `/aviso?m=${r.motivo}`;
  }
}

// --- Toque pendiente (cliente nuevo, entre el toque y el formulario) ---------

type ToqueFirmado = Toque & { jti: string; exp: number };
export const DURACION_TOQUE_PENDIENTE = 15 * 60;

export function firmarToquePendiente(toque: Toque): string {
  return firmar(
    { ...toque, jti: randomUUID(), exp: Math.floor(Date.now() / 1000) + DURACION_TOQUE_PENDIENTE },
    env.hmacSecret,
  );
}

export function leerToquePendiente(token: string | undefined): ToqueFirmado | null {
  return verificarFirma<ToqueFirmado>(token, env.hmacSecret);
}

/** Marca el toque pendiente como usado (un solo uso). */
export async function consumirToquePendiente(t: ToqueFirmado): Promise<boolean> {
  const db = crearClienteAdmin();
  const { data } = await db.rpc("consumir_qr", {
    p_jti: `toque:${t.jti}`,
    p_expira_en: new Date(t.exp * 1000).toISOString(),
  });
  return data === true;
}
