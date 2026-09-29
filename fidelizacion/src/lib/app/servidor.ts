import "server-only";
import { createHash } from "node:crypto";
import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { clienteDesdeToken, hashToken, nuevoTokenDispositivo, type ClienteActual } from "@/lib/dispositivo";
import { env } from "@/lib/env";
import type { Local } from "@/lib/locales";
import { textoMovimiento } from "@/lib/movimientos";
import { appleWalletActivo } from "@/lib/wallet/apple";
import { ingresoBloqueado, LIMITE_INGRESO, localApp, resumenTarjeta, tokenBearer, type TarjetaDetalleApp, type TarjetaResumenApp } from "./contrato";

export const json = (cuerpo: unknown, status = 200) => NextResponse.json(cuerpo, { status, headers: { "Cache-Control": "no-store" } });
export const error = (mensaje: string, status: number) => json({ error: mensaje }, status);

/** Cliente dueño del token Bearer (el mismo token de dispositivo que la cookie de la web). */
export async function clienteDeRequest(req: Request): Promise<ClienteActual | null> {
  return clienteDesdeToken(tokenBearer(req.headers.get("authorization")) ?? undefined);
}

// --- Ingreso con WhatsApp ----------------------------------------------------------------

const hashIp = (req: Request) =>
  createHash("sha256")
    .update(`${req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "sin-ip"}|${env.hmacSecret}`)
    .digest("hex");

export async function ingresoPermitido(req: Request) {
  const desde = new Date(Date.now() - LIMITE_INGRESO.ventanaMin * 60_000).toISOString();
  const { data } = await crearClienteAdmin().from("intentos_app").select("exitoso").eq("ip_hash", hashIp(req)).gte("created_at", desde);
  return !ingresoBloqueado(data ?? []);
}

export async function registrarIntento(req: Request, exitoso: boolean) {
  await crearClienteAdmin().from("intentos_app").insert({ ip_hash: hashIp(req), exitoso });
}

/** Da un token de dispositivo nuevo al cliente (como vincularCelular en la web). */
export async function nuevoDispositivoApp(clienteId: string, userAgent: string) {
  const { token, hash } = nuevoTokenDispositivo();
  const { error: e } = await crearClienteAdmin()
    .from("dispositivos")
    .insert({ cliente_id: clienteId, token_hash: hash, user_agent: `Point app · ${userAgent}`.slice(0, 300) });
  if (e) throw new Error(e.message);
  return token;
}

export async function revocarDispositivo(req: Request) {
  const token = tokenBearer(req.headers.get("authorization"));
  if (!token) return;
  await crearClienteAdmin().from("dispositivos").update({ revocado_en: new Date().toISOString() }).eq("token_hash", hashToken(token));
}

// --- Tarjetas ------------------------------------------------------------------------------

const COLUMNAS_LOCAL =
  "id, slug, nombre, rubro, logo_url, icono_url, color_primario, color_secundario, color_texto, color_etiqueta, franja_url, nombre_programa, texto_dorso, minutos_entre_puntos, zona_horaria, termino_personal, puntos_bienvenida, puntos_cumple, latitud, longitud, activo";

type FilaTarjeta = { id: string; serial: string; wallet_auth_token: string; puntos: number; actualizada_en?: string; locales: (Local & { activo: boolean }) | null };

async function tarjetasConLocal(clienteId: string, slug?: string): Promise<FilaTarjeta[]> {
  let q = crearClienteAdmin()
    .from("tarjetas")
    .select(`id, serial, wallet_auth_token, puntos, locales!inner(${COLUMNAS_LOCAL})`)
    .eq("cliente_id", clienteId)
    .eq("locales.activo", true);
  if (slug) q = q.eq("locales.slug", slug);
  const { data } = await q;
  return ((data ?? []) as unknown as FilaTarjeta[]).filter((t) => t.locales);
}

async function premiosPorLocal(localIds: string[]) {
  if (!localIds.length) return new Map<string, { id: string; nombre: string; descripcion: string | null; puntos_necesarios: number }[]>();
  const { data } = await crearClienteAdmin()
    .from("premios")
    .select("id, local_id, nombre, descripcion, puntos_necesarios")
    .in("local_id", localIds)
    .eq("activo", true)
    .order("puntos_necesarios");
  const mapa = new Map<string, { id: string; nombre: string; descripcion: string | null; puntos_necesarios: number }[]>();
  for (const p of data ?? []) mapa.set(p.local_id, [...(mapa.get(p.local_id) ?? []), p]);
  return mapa;
}

export async function tarjetasDelCliente(clienteId: string): Promise<TarjetaResumenApp[]> {
  const filas = await tarjetasConLocal(clienteId);
  const premios = await premiosPorLocal(filas.map((t) => t.locales!.id));
  return filas
    .map((t) => resumenTarjeta(localApp(t.locales!, env.appUrl), t.puntos, premios.get(t.locales!.id) ?? []))
    .sort((a, b) => b.puntos - a.puntos || a.local.nombre.localeCompare(b.local.nombre, "es"));
}

export async function detalleTarjeta(clienteId: string, slug: string): Promise<{ detalle: TarjetaDetalleApp; local: Local } | null> {
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) return null;
  const [t] = await tarjetasConLocal(clienteId, slug);
  if (!t) return null;
  const local = t.locales!;
  const [premios, { data: movs }] = await Promise.all([
    premiosPorLocal([local.id]).then((m) => m.get(local.id) ?? []),
    crearClienteAdmin()
      .from("movimientos")
      .select("id, tipo, puntos, motivo, detalle, created_at")
      .eq("tarjeta_id", t.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const base = env.appUrl.replace(/\/$/, "");
  const qr = `${base}/w/${t.serial}/${t.wallet_auth_token}`;
  const qrSvg = await QRCode.toString(qr, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#111311", light: "#ffffff" } });
  return {
    local,
    detalle: {
      ...resumenTarjeta(localApp(local, env.appUrl), t.puntos, premios),
      premios: premios.map((p) => ({ id: p.id, nombre: p.nombre, descripcion: p.descripcion, puntos: p.puntos_necesarios, alcanza: t.puntos >= p.puntos_necesarios })),
      qr,
      qrSvg,
      appleWallet: appleWalletActivo(),
      personal: local.termino_personal,
      movimientos: (movs ?? []).map((m) => ({ id: m.id, tipo: m.tipo, texto: textoMovimiento(m), puntos: m.puntos, fecha: m.created_at })),
    },
  };
}

/** "Eliminar mi cuenta": borra al cliente, sus tarjetas, historial, canjes, celulares y pases (en cascada). */
export async function eliminarCuenta(clienteId: string) {
  const { error: e } = await crearClienteAdmin().from("clientes").delete().eq("id", clienteId);
  if (e) throw new Error(e.message);
}
