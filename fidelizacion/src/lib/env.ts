import "server-only";

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
