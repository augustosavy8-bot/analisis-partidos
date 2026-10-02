import "server-only";
import { leerCredenciales, type CredencialesGoogle } from "@/lib/wallet/google-core";
import { leerCredencialesApple, type CredencialesApple } from "@/lib/wallet/apple-core";

let avisoGoogle = false;
let avisoApple = false;

function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}. Mirá .env.example.`);
  return valor;
}

export const env = {
  get supabaseUrl() {
    return requerida("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return requerida("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get supabaseServiceRoleKey() {
    return requerida("SUPABASE_SERVICE_ROLE_KEY");
  },
  get appUrl() {
    return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  /** Secreto para firmar tokens (toque pendiente, QR). Generar: openssl rand -base64 32 */
  get hmacSecret() {
    const v = requerida("HMAC_SECRET");
    if (v.length < 32) throw new Error("HMAC_SECRET debe tener al menos 32 caracteres");
    return v;
  },
  /** Clave maestra AES-256 (64 hex) para cifrar las claves de los chips. */
  get chipsMasterKey() {
    const v = requerida("CHIPS_MASTER_KEY");
    if (!/^[0-9a-f]{64}$/i.test(v)) throw new Error("CHIPS_MASTER_KEY debe ser 64 caracteres hex");
    return v;
  },
  /**
   * Clave AES-128 (32 hex) SDMMetaRead, común a todos los chips de producción.
   * Descifra el PICCData (UID + contador) antes de saber de qué chip se trata.
   */
  get sdmMetaKey() {
    const v = requerida("NFC_SDM_META_KEY");
    if (!/^[0-9a-f]{32}$/i.test(v)) throw new Error("NFC_SDM_META_KEY debe ser 32 caracteres hex (AES-128)");
    return Buffer.from(v, "hex");
  },
  /**
   * Google Wallet (opcional): GOOGLE_WALLET_ISSUER_ID + GOOGLE_SERVICE_ACCOUNT_JSON
   * (el contenido del JSON de la cuenta de servicio). Si faltan o son inválidas,
   * devuelve null y el proveedor queda desactivado (no rompe nada).
   */
  get googleWallet(): CredencialesGoogle | null {
    const issuer = process.env.GOOGLE_WALLET_ISSUER_ID?.trim();
    const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
    if (!issuer || !json) return null;
    try {
      return leerCredenciales(issuer, json);
    } catch (e) {
      if (!avisoGoogle) console.error(`Google Wallet desactivado: ${e instanceof Error ? e.message : e}`);
      avisoGoogle = true;
      return null;
    }
  },
  /**
   * Apple Wallet (opcional): APPLE_PASS_TYPE_ID, APPLE_TEAM_ID y los PEM
   * APPLE_PASS_CERT, APPLE_PASS_KEY (sin contraseña) y APPLE_WWDR_CERT (G4).
   * Si falta alguna o es inválida, devuelve null (proveedor desactivado).
   * El aviso nunca incluye los valores.
   */
  get appleWallet(): CredencialesApple | null {
    const v = {
      passTypeId: process.env.APPLE_PASS_TYPE_ID,
      teamId: process.env.APPLE_TEAM_ID,
      cert: process.env.APPLE_PASS_CERT,
      key: process.env.APPLE_PASS_KEY,
      wwdr: process.env.APPLE_WWDR_CERT,
    };
    if (!v.passTypeId || !v.teamId || !v.cert || !v.key || !v.wwdr) return null;
    try {
      return leerCredencialesApple(v);
    } catch (e) {
      if (!avisoApple) console.error(`Apple Wallet desactivado: ${e instanceof Error ? e.message : "credenciales inválidas"}`);
      avisoApple = true;
      return null;
    }
  },
  /** Access Token de Mercado Pago (sólo servidor). En pruebas, el de la cuenta de prueba vendedora. */
  get mpAccessToken() {
    return requerida("MP_ACCESS_TOKEN");
  },
  /** Clave secreta de Webhooks de Mercado Pago (valida el header x-signature). */
  get mpWebhookSecret() {
    return requerida("MP_WEBHOOK_SECRET");
  },
  /** Protege /api/cron/* (Vercel Cron manda "Authorization: Bearer <CRON_SECRET>"). */
  get cronSecret() {
    return requerida("CRON_SECRET");
  },
  /** ¿Están cargadas las credenciales de Mercado Pago? (para no romper páginas sin configurar) */
  get mpConfigurado() {
    return Boolean(process.env.MP_ACCESS_TOKEN && process.env.NEXT_PUBLIC_MP_PUBLIC_KEY);
  },
  get esProduccion() {
    return process.env.NODE_ENV === "production";
  },
  /**
   * Interruptor global del modo prueba (tags NTAG213 con token estático).
   * En producción debe estar en "false": aunque un chip tenga modo=prueba, se rechaza.
   */
  get permitirModoPrueba() {
    return process.env.PERMITIR_MODO_PRUEBA === "true";
  },
};
