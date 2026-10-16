import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Chequeo de salud: ¿responde la base? No muestra datos (es público). */
export async function GET() {
  const { error } = await crearClienteAdmin().from("locales").select("id").limit(1);
  if (error) {
    console.error("Salud: la base no responde", error.message);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
