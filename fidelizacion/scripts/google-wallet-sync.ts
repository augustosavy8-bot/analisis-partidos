/**
 * Crea o actualiza en Google Wallet la loyaltyClass de todos los locales activos.
 *
 *   npm run wallet:google:sync
 *
 * Usa .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_URL,
 * GOOGLE_WALLET_ISSUER_ID y GOOGLE_SERVICE_ACCOUNT_JSON.
 */
import { createClient } from "@supabase/supabase-js";
import { idClase, leerCredenciales, upsertClase, type CredencialesGoogle } from "../src/lib/wallet/google-core";

function salir(msg: string): never {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = process.env.APP_URL;
if (!url || !key) salir("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
if (!appUrl?.startsWith("https://")) salir("APP_URL tiene que ser la URL pública https (Google baja las imágenes de ahí)");

let cred: CredencialesGoogle;
try {
  cred = leerCredenciales(process.env.GOOGLE_WALLET_ISSUER_ID ?? "", process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? "");
} catch (e) {
  salir(e instanceof Error ? e.message : String(e));
}

async function main(cred: CredencialesGoogle, url: string, key: string, appUrl: string) {
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: locales, error } = await db
    .from("locales")
    .select("id, slug, nombre, logo_url, color_primario, premios(nombre, puntos_necesarios, activo)")
    .eq("activo", true)
    .order("nombre");
  if (error) salir(error.message);

  let fallidos = 0;
  for (const l of locales ?? []) {
    const premios = (l.premios ?? [])
      .filter((p) => p.activo)
      .sort((a, b) => a.puntos_necesarios - b.puntos_necesarios)
      .map((p) => ({ nombre: p.nombre, puntos: p.puntos_necesarios }));
    try {
      await upsertClase(cred, { slug: l.slug, nombre: l.nombre, logoUrl: l.logo_url, colorPrimario: l.color_primario, premios }, appUrl);
      console.log(`✔ ${l.nombre} → ${idClase(cred.issuerId, l.slug)}`);
    } catch (e) {
      fallidos++;
      console.error(`✖ ${l.nombre}: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`\n${(locales?.length ?? 0) - fallidos} clases al día, ${fallidos} con error.`);
  if (fallidos) process.exit(1);
}

void main(cred, url, key, appUrl);
