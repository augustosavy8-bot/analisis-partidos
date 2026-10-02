import { NextResponse, type NextRequest } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * Vuelta de los links de Supabase Auth (recuperar contraseña, confirmar el
 * registro): canjea el código por una sesión.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") ?? "/panel";
  // Sólo rutas propias: "/\\evil.com" o "//evil.com" el navegador los toma como otro sitio.
  const destino = /^\/(?![\/\\])/.test(next) && new URL(next, req.url).origin === req.nextUrl.origin ? next : "/panel";

  if (code) {
    const db = await crearClienteServidor();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destino, req.url));
  }
  // Confirmación de registro abierta en otro navegador: el email ya quedó
  // confirmado, pero la sesión no se puede abrir acá. Que ingrese con su contraseña.
  if (req.nextUrl.searchParams.get("tipo") === "registro") {
    return NextResponse.redirect(new URL("/panel/ingresar?aviso=confirmado", req.url));
  }
  return NextResponse.redirect(new URL("/panel/ingresar?error=link", req.url));
}
