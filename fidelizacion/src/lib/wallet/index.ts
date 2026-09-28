import "server-only";
import { env } from "@/lib/env";
import { proveedorGoogle } from "./google";

/**
 * Integración con billeteras nativas.
 *
 *  - Cada tarjeta tiene `serial` (serialNumber de Apple / id del objeto de Google)
 *    y `wallet_auth_token` (authenticationToken de Apple; también arma el link /w/…).
 *  - `tarjetas.actualizada_en` cambia en cada suma/canje (passesUpdatedSince de Apple).
 *  - `wallet_registros` guarda quién pidió cada pase (plataforma + dispositivo).
 *  - Después de cada cambio de puntos se llama a `notificarCambioTarjeta` (con after()).
 *
 * Google Wallet: implementado (lib/wallet/google.ts), activo si hay credenciales.
 * Apple Wallet: pendiente (hoy se usa Pass2U).
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
