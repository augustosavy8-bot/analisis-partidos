import "server-only";
import { env } from "@/lib/env";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { actualizarObjetosGoogleLocal, enviarMensajeGoogle, proveedorGoogle, sincronizarClaseLocal } from "./google";
import { notificarCambioLocalApple, notificarMensajeApple, proveedorApple } from "./apple";

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
  /** Franja subida por el local (Google: heroImage del objeto). */
  franjaUrl?: string | null;
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

/**
 * Guardaron el diseño de la tarjeta: clase de Google + todos sus objetos (franja)
 * y todos los pases de Apple (updated_at + push). Llamalo dentro de after(); nunca lanza.
 */
export async function actualizarDisenoLocal(localId: string) {
  await sincronizarClaseLocal(localId); // primero la clase: los objetos la referencian
  await Promise.allSettled([actualizarObjetosGoogleLocal(localId), notificarCambioLocalApple(localId)]);
}

/**
 * Mensaje del local a sus clientes: Google (Add Message API, TEXT_AND_NOTIFY) y
 * Apple (campo Novedades + push). Guarda el resultado en mensajes_local.
 * Llamalo dentro de after(); nunca lanza.
 */
export async function enviarMensajeLocal(m: { id: string; localId: string; titulo: string; texto: string }) {
  const db = crearClienteAdmin();
  try {
    const [google, apple] = await Promise.all([
      enviarMensajeGoogle(m.localId, { id: m.id, titulo: m.titulo, texto: m.texto }),
      notificarMensajeApple(m.localId),
    ]);
    // Si Google falló en todos y no había pases de Apple, no cuenta para el límite diario.
    const error = google.fallidos > 0 && google.enviados === 0 && apple === 0;
    await db
      .from("mensajes_local")
      .update({
        estado: error ? "error" : "enviado",
        google_enviados: google.enviados,
        google_fallidos: google.fallidos,
        apple_pases: apple,
      })
      .eq("id", m.id);
  } catch (e) {
    console.error("Wallet: no se pudo enviar el mensaje", m.id, e instanceof Error ? e.message : e);
    await db.from("mensajes_local").update({ estado: "error" }).eq("id", m.id);
  }
}
