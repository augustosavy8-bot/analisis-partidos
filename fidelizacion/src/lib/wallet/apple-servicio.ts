import "server-only";
import { env } from "@/lib/env";
import { paseApple } from "./apple";
import { tokenDeAutorizacion, tokenValido } from "./apple-core";

/** Respuesta vacía con status (el web service de Apple no espera cuerpo en los errores). */
export const vacio = (status: number, headers?: HeadersInit) => new Response(null, { status, headers });

/** El passTypeId de la URL tiene que ser el nuestro (y Apple Wallet tiene que estar activo). */
export function passTypeValido(passTypeId: string) {
  const cred = env.appleWallet;
  return !!cred && cred.passTypeId === passTypeId;
}

/**
 * Valida "Authorization: ApplePass <token>" contra el authenticationToken del pase.
 * Devuelve el pase, o la Response de error (404 pase inexistente, 401 token inválido).
 */
export async function autorizarPase(req: Request, passTypeId: string, serial: string) {
  if (!passTypeValido(passTypeId)) return { error: vacio(404) };
  const pase = await paseApple(serial);
  if (!pase) return { error: vacio(401) };
  if (!tokenValido(pase.auth_token, tokenDeAutorizacion(req.headers.get("authorization")))) return { error: vacio(401) };
  return { pase };
}

/** deviceLibraryIdentifier y pushToken: sólo caracteres seguros y largo acotado. */
export const idSeguro = (v: string) => /^[A-Za-z0-9._-]{1,200}$/.test(v);
