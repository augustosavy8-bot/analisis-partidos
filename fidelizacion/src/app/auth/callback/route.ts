import { NextResponse, type NextRequest } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";

/** Vuelta de los links de Supabase Auth (recuperar contraseña): canjea el código por una sesión. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") ?? "/panel";
  const destino = next.startsWith("/") && !next.startsWith("//") ? next : "/panel";

  if (code) {
    const db = await crearClienteServidor();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destino, req.url));
  }
  return NextResponse.redirect(new URL("/panel/ingresar?error=link", req.url));
}
