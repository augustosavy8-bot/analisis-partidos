import "server-only";
import { env } from "@/lib/env";
import { proveedorGoogle, sincronizarClaseLocal } from "./google";
import { notificarCambioLocalApple, proveedorApple } from "./apple";

/**
 * Integración con billeteras nativas.
 *
 *  - Cada tarjeta tiene `serial` (serialNumber de Apple / id del objeto de Google)
 *    y `wallet_auth_token` (authenticationToken de Apple; también arma el link /w/…).
 *  - `tarjetas.actualizada_en` cambia en cada suma/canje (passesUpdatedSince de Apple).
 *  - `wallet_registros` guarda quién pidió cada pase (plataforma + dispositivo).
 *  - Después de cada cambio de puntos se llama a `notificarCambioTarjeta` (con after()).
 *
 * Google Wallet: lib/wallet/google.ts. Apple Wallet: lib/wallet/apple.ts (+ web
 * service en /api/apple-wallet/v1). Cada uno se activa si tiene credenciales.
 */
export type PlataformaWallet = "apple" | "google";

export interface DatosPase {
  serial: string;
  /** wallet_auth_token de la tarjeta (arma el link /w/<serial>/<token> del QR). */
  token: string;
  localSlug: string;
  localNombre: string;
  clienteNombre: string;
  puntos: number;
  proximoPremio?: { nombre: string; puntosNecesarios: number };
  colorPrimario: string;
  colorSecundario: string;
  logoUrl?: string | null;
  urlTarjeta: string;
  /** Ids de la tarjeta (Apple guarda el pase por tarjeta). */
  tarjetaId?: string;
  clienteId?: string;
  localId?: string;
}

export interface ProveedorWallet {
  plataforma: PlataformaWallet;
  /** Devuelve una URL o archivo (.pkpass) para agregar el pase. */
  generarPase(datos: DatosPase): Promise<{ url?: string; archivo?: Uint8Array }>;
  /** Avisa a los dispositivos que el pase cambió. */
  notificarCambio(serial: string): Promise<void>;
}

const proveedores: ProveedorWallet[] = [];

export function registrarProveedorWallet(p: ProveedorWallet) {
  if (!proveedores.includes(p)) proveedores.push(p);
}

export function proveedorWallet(plataforma: PlataformaWallet) {
  return proveedores.find((p) => p.plataforma === plataforma) ?? null;
}

if (env.googleWallet) registrarProveedorWallet(proveedorGoogle);
if (env.appleWallet) registrarProveedorWallet(proveedorApple);

/**
 * Punto único a llamar después de cada cambio de puntos (suma, canje o regalo).
 * Llamalo dentro de after(): nunca lanza y no demora la respuesta.
 */
export async function notificarCambioTarjeta(serial: string) {
  const resultados = await Promise.allSettled(proveedores.map((p) => p.notificarCambio(serial)));
  resultados.forEach((r, i) => {
    if (r.status === "rejected") console.error(`Wallet ${proveedores[i].plataforma}: no se pudo actualizar ${serial}`, r.reason);
  });
}

/**
 * Cambió el local (nombre, logo, colores, ubicación) o sus premios: actualiza la
 * clase de Google y los pases de Apple (push). Llamalo dentro de after(); nunca lanza.
 */
export async function notificarCambioLocal(localId: string) {
  await Promise.allSettled([sincronizarClaseLocal(localId), notificarCambioLocalApple(localId)]);
}
