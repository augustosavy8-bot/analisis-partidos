/**
 * Integración con Apple Wallet / Google Wallet — PREPARADA, NO IMPLEMENTADA.
 *
 * Diseño previsto:
 *  - Cada tarjeta ya tiene `serial` (serialNumber / objectId) y `wallet_auth_token`
 *    (authenticationToken del web service de Apple).
 *  - `tarjetas.actualizada_en` cambia en cada suma/canje (passesUpdatedSince).
 *  - `wallet_registros` guarda los dispositivos que siguen un pase (push tokens).
 *  - Cuando cambian los puntos, el servidor llamará a `notificarCambio` de cada
 *    proveedor registrado (push APNs para Apple, PATCH del objeto para Google).
 */
export type PlataformaWallet = "apple" | "google";

export interface DatosPase {
  serial: string;
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
  proveedores.push(p);
}

/** Punto único a llamar después de cada cambio de puntos. Hoy no hace nada. */
export async function notificarCambioTarjeta(serial: string) {
  await Promise.allSettled(proveedores.map((p) => p.notificarCambio(serial)));
}
