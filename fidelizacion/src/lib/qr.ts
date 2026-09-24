import "server-only";
import { randomBytes } from "node:crypto";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { firmar, verificarFirma } from "@/lib/firmas";
import { env } from "@/lib/env";
import type { Toque } from "@/lib/toque";

/** El QR se renueva cada 30 s; aceptamos 15 s extra para escanear y cargar la página. */
export const ROTACION_QR_SEG = 30;
const VALIDEZ_QR_SEG = ROTACION_QR_SEG + 15;

type PayloadQR = { m: string; l: string; s: string; j: string; exp: number };

export function emitirQR(mozo: { mozoId: string; localId: string; localSlug: string }) {
  const j = randomBytes(12).toString("base64url");
  const ahora = Math.floor(Date.now() / 1000);
  const token = firmar(
    { m: mozo.mozoId, l: mozo.localId, s: mozo.localSlug, j, exp: ahora + VALIDEZ_QR_SEG } satisfies PayloadQR,
    env.hmacSecret,
  );
  return {
    jti: j,
    url: `${env.appUrl}/n?q=${token}`,
    renovarEn: new Date((ahora + ROTACION_QR_SEG) * 1000).toISOString(),
  };
}

export const jtiQR = (j: string) => `qr:${j}`;

/**
 * Valida un QR escaneado: firma, vencimiento, mozo activo y UN SOLO USO.
 * Si es válido lo marca como usado.
 */
export async function validarQR(token: string): Promise<{ ok: true; toque: Toque } | { ok: false; motivo: string }> {
  const p = verificarFirma<PayloadQR>(token, env.hmacSecret);
  if (!p) return { ok: false, motivo: "qr_vencido" };

  const db = crearClienteAdmin();
  const { data: mozo } = await db
    .from("mozos")
    .select("id, activo, locales(activo)")
    .eq("id", p.m)
    .eq("local_id", p.l)
    .maybeSingle();
  const local = mozo?.locales as unknown as { activo: boolean } | undefined;
  if (!mozo?.activo || !local?.activo) return { ok: false, motivo: "qr_invalido" };

  const { data: nuevo } = await db.rpc("consumir_qr", {
    p_jti: jtiQR(p.j),
    p_expira_en: new Date(p.exp * 1000).toISOString(),
  });
  if (nuevo !== true) return { ok: false, motivo: "qr_usado" };

  return { ok: true, toque: { localId: p.l, localSlug: p.s, mozoId: p.m, chipId: null, origen: "qr" } };
}

export async function qrFueUsado(j: string): Promise<boolean> {
  const db = crearClienteAdmin();
  const { data } = await db.from("qr_usados").select("jti").eq("jti", jtiQR(j)).maybeSingle();
  return !!data;
}
