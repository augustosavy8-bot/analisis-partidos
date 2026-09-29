/**
 * Google Wallet (loyalty): armado de clase/objeto, JWT "Guardar en Google Wallet"
 * y llamadas a la API REST. Sin dependencias y sin "server-only" para poder usarlo
 * desde scripts/ y tests. La firma RS256 se hace con node:crypto.
 *
 * Ids:  clase  = {ISSUER_ID}.local_{slug}
 *       objeto = {ISSUER_ID}.{serial}
 */
import { createSign } from "node:crypto";

export const API_WALLET = "https://walletobjects.googleapis.com/walletobjects/v1";
const URL_TOKEN = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer";
const IDIOMA = "es-419";

export type CredencialesGoogle = { issuerId: string; clientEmail: string; privateKey: string };

/** Valida GOOGLE_WALLET_ISSUER_ID y el JSON de la cuenta de servicio. Lanza con un mensaje claro. */
export function leerCredenciales(issuerId: string, jsonCuenta: string): CredencialesGoogle {
  if (!/^\d{10,25}$/.test(issuerId)) throw new Error("GOOGLE_WALLET_ISSUER_ID debe ser el número de issuer (sólo dígitos)");
  let cuenta: { client_email?: unknown; private_key?: unknown };
  try {
    cuenta = JSON.parse(jsonCuenta);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON no es un JSON válido");
  }
  if (typeof cuenta.client_email !== "string" || !cuenta.client_email.includes("@")) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON no tiene client_email");
  }
  if (typeof cuenta.private_key !== "string" || !cuenta.private_key.includes("PRIVATE KEY")) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON no tiene private_key");
  }
  return { issuerId, clientEmail: cuenta.client_email, privateKey: cuenta.private_key };
}

export const idClase = (issuerId: string, slug: string) => `${issuerId}.local_${slug}`;
export const idObjeto = (issuerId: string, serial: string) => `${issuerId}.${serial}`;

const texto = (valor: string) => ({ defaultValue: { language: IDIOMA, value: valor } });
const imagen = (uri: string, descripcion: string) => ({ sourceUri: { uri }, contentDescription: texto(descripcion) });

// --- Clase (una por local) ------------------------------------------------------

export type LocalGoogle = {
  slug: string;
  nombre: string;
  logoUrl: string | null;
  colorPrimario: string;
  premios: { nombre: string; puntos: number }[];
  /** Ubicación del local: Google muestra el pase cuando el cliente está cerca. */
  ubicacion?: { latitud: number; longitud: number } | null;
};

export function armarClase(issuerId: string, local: LocalGoogle, appUrl: string) {
  const base = appUrl.replace(/\/$/, "");
  const premios = local.premios.length
    ? local.premios.map((p) => `${p.nombre} · ${p.puntos} ${p.puntos === 1 ? "punto" : "puntos"}`).join("\n")
    : "Sumá puntos en cada visita.";
  return {
    id: idClase(issuerId, local.slug),
    issuerName: local.nombre,
    programName: local.nombre,
    // Google pide un logo cuadrado: si el local no tiene, usamos el ícono generado.
    programLogo: imagen(local.logoUrl ?? `${base}/t/${local.slug}/icono?s=660`, `Logo de ${local.nombre}`),
    heroImage: imagen(`${base}/t/${local.slug}/cabecera`, local.nombre),
    hexBackgroundColor: local.colorPrimario,
    countryCode: "AR",
    reviewStatus: "UNDER_REVIEW",
    textModulesData: [{ id: "premios", header: "Premios", body: premios }],
    linksModuleData: { uris: [{ id: "point", uri: `${base}/t/${local.slug}`, description: "Abrir la tarjeta" }] },
    // Sin ubicación mandamos [] para que un PATCH borre la anterior.
    merchantLocations: local.ubicacion ? [{ latitude: local.ubicacion.latitud, longitude: local.ubicacion.longitud }] : [],
  };
}

// --- Objeto (uno por tarjeta) ---------------------------------------------------

export type TarjetaGoogle = {
  serial: string;
  token: string;
  puntos: number;
  clienteNombre: string;
  localSlug: string;
  localNombre: string;
  /** Próximo premio (el primero que todavía no alcanza, o el último si ya los alcanzó todos). */
  proximo: { nombre: string; puntos: number } | null;
};

export function textoProgreso(puntos: number, proximo: TarjetaGoogle["proximo"]) {
  if (!proximo) return "Sumá puntos en cada visita.";
  const faltan = proximo.puntos - puntos;
  if (faltan <= 0) return `¡Ya podés canjear ${proximo.nombre}!`;
  return `${proximo.nombre} · te ${faltan === 1 ? "falta 1 punto" : `faltan ${faltan} puntos`}`;
}

/**
 * `notificar`: pide a Google que avise al cliente del cambio de loyaltyPoints.balance
 * (notifyPreference vale sólo para ese request; Google permite 3 avisos por pase cada 24 hs).
 */
export function armarObjeto(issuerId: string, t: TarjetaGoogle, appUrl: string, notificar = false) {
  const base = appUrl.replace(/\/$/, "");
  const urlPase = `${base}/w/${t.serial}/${t.token}`;
  const franja = `${base}/t/${t.localSlug}/franja?p=${t.puntos}${t.proximo ? `&m=${t.proximo.puntos}` : ""}`;
  return {
    id: idObjeto(issuerId, t.serial),
    classId: idClase(issuerId, t.localSlug),
    state: "ACTIVE",
    accountId: t.serial.slice(0, 8).toUpperCase(),
    accountName: t.clienteNombre,
    loyaltyPoints: { label: "Puntos", balance: { int: t.puntos } },
    ...(t.proximo
      ? { secondaryLoyaltyPoints: { label: "Próximo premio", balance: { string: `${Math.min(t.puntos, t.proximo.puntos)}/${t.proximo.puntos}` } } }
      : {}),
    heroImage: imagen(franja, `Tus sellos en ${t.localNombre}`),
    textModulesData: [{ id: "progreso", header: "Próximo premio", body: textoProgreso(t.puntos, t.proximo) }],
    barcode: { type: "QR_CODE", value: urlPase, alternateText: "Tu tarjeta" },
    linksModuleData: { uris: [{ id: "tarjeta", uri: `${base}/t/${t.localSlug}`, description: "Abrir mi tarjeta completa" }] },
    ...(notificar ? { notifyPreference: "NOTIFY_ON_UPDATE" } : {}),
  };
}

// --- JWT ------------------------------------------------------------------------

const b64url = (v: string | Buffer) => Buffer.from(v).toString("base64url");

/** JWT RS256 firmado con la clave de la cuenta de servicio. */
export function firmarJwt(payload: object, privateKey: string) {
  const cabecera = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const cuerpo = b64url(JSON.stringify(payload));
  const firma = createSign("RSA-SHA256").update(`${cabecera}.${cuerpo}`).sign(privateKey);
  return `${cabecera}.${cuerpo}.${b64url(firma)}`;
}

/**
 * JWT "skinny" de Guardar en Google Wallet: sólo el id del objeto (que ya tiene
 * que existir en Google). El link queda corto.
 */
export function jwtGuardar(cred: CredencialesGoogle, objetoId: string, origins: string[], ahora = Date.now()) {
  return firmarJwt(
    {
      iss: cred.clientEmail,
      aud: "google",
      typ: "savetowallet",
      iat: Math.floor(ahora / 1000),
      origins,
      payload: { loyaltyObjects: [{ id: objetoId }] },
    },
    cred.privateKey,
  );
}

export const urlGuardar = (jwt: string) => `https://pay.google.com/gp/v/save/${jwt}`;

// --- Token OAuth (cacheado en memoria) ------------------------------------------

type Fetch = typeof fetch;
const tokens = new Map<string, { token: string; vence: number }>();
/** Se renueva cuando faltan menos de 5 minutos para que venza. */
const MARGEN_MS = 5 * 60 * 1000;

export async function tokenAcceso(cred: CredencialesGoogle, f: Fetch = fetch, ahora = Date.now()): Promise<string> {
  const guardado = tokens.get(cred.clientEmail);
  if (guardado && guardado.vence - MARGEN_MS > ahora) return guardado.token;

  const iat = Math.floor(ahora / 1000);
  const asercion = firmarJwt({ iss: cred.clientEmail, scope: SCOPE, aud: URL_TOKEN, iat, exp: iat + 3600 }, cred.privateKey);
  const res = await f(URL_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: asercion }),
  });
  if (!res.ok) throw new Error(`Google OAuth ${res.status}: ${await res.text()}`);
  const { access_token, expires_in } = (await res.json()) as { access_token: string; expires_in: number };
  tokens.set(cred.clientEmail, { token: access_token, vence: ahora + expires_in * 1000 });
  return access_token;
}

/** Sólo para tests. */
export function olvidarTokens() {
  tokens.clear();
}

// --- API REST -------------------------------------------------------------------

async function llamar(cred: CredencialesGoogle, metodo: "POST" | "PATCH", ruta: string, cuerpo: object, f: Fetch) {
  const token = await tokenAcceso(cred, f);
  return f(`${API_WALLET}${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}

async function fallar(res: Response, que: string): Promise<never> {
  throw new Error(`Google Wallet ${que} ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

/** Inserta; si ya existe (409), actualiza con PATCH. */
async function upsert(cred: CredencialesGoogle, recurso: "loyaltyClass" | "loyaltyObject", cuerpo: { id: string }, f: Fetch) {
  const alta = await llamar(cred, "POST", `/${recurso}`, cuerpo, f);
  if (alta.ok) return;
  if (alta.status !== 409) return fallar(alta, `insert ${recurso}`);
  const cambio = await llamar(cred, "PATCH", `/${recurso}/${encodeURIComponent(cuerpo.id)}`, cuerpo, f);
  if (!cambio.ok) return fallar(cambio, `patch ${recurso}`);
}

export function upsertClase(cred: CredencialesGoogle, local: LocalGoogle, appUrl: string, f: Fetch = fetch) {
  return upsert(cred, "loyaltyClass", armarClase(cred.issuerId, local, appUrl), f);
}

export function upsertObjeto(cred: CredencialesGoogle, t: TarjetaGoogle, appUrl: string, f: Fetch = fetch) {
  return upsert(cred, "loyaltyObject", armarObjeto(cred.issuerId, t, appUrl), f);
}

/** PATCH del objeto. Devuelve false si no existe (404): no es un error para el toque. */
export async function patchObjeto(cred: CredencialesGoogle, t: TarjetaGoogle, appUrl: string, f: Fetch = fetch, notificar = false) {
  const objeto = armarObjeto(cred.issuerId, t, appUrl, notificar);
  const res = await llamar(cred, "PATCH", `/loyaltyObject/${encodeURIComponent(objeto.id)}`, objeto, f);
  if (res.status === 404) return false;
  if (!res.ok) return fallar(res, "patch loyaltyObject");
  return true;
}

// --- Mensajes (Add Message API) ---------------------------------------------------

export type MensajeGoogle = { id: string; titulo: string; texto: string };

/**
 * Agrega un mensaje al dorso del pase y manda la notificación (TEXT_AND_NOTIFY).
 * Devuelve false si el objeto no existe (404).
 */
export async function agregarMensaje(cred: CredencialesGoogle, serial: string, m: MensajeGoogle, f: Fetch = fetch) {
  const id = idObjeto(cred.issuerId, serial);
  const res = await llamar(cred, "POST", `/loyaltyObject/${encodeURIComponent(id)}/addMessage`, {
    message: { id: m.id, header: m.titulo, body: m.texto, messageType: "TEXT_AND_NOTIFY" },
  }, f);
  if (res.status === 404) return false;
  if (!res.ok) return fallar(res, "addMessage");
  return true;
}
