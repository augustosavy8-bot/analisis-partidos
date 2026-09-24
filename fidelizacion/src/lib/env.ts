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
  /**
   * Interruptor global del modo prueba (tags NTAG213 con token estático).
   * En producción debe estar en "false": aunque un chip tenga modo=prueba, se rechaza.
   */
  get permitirModoPrueba() {
    return process.env.PERMITIR_MODO_PRUEBA === "true";
  },
};
