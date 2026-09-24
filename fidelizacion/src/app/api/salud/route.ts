import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Chequeo de salud: conexión a Supabase y conteos básicos. */
export async function GET() {
  try {
    const db = crearClienteAdmin();
    const tablas = ["locales", "mozos", "chips", "premios", "clientes", "tarjetas", "movimientos"] as const;
    const conteos: Record<string, number> = {};
    for (const tabla of tablas) {
      const { count, error } = await db.from(tabla).select("*", { count: "exact", head: true });
      if (error) throw new Error(`${tabla}: ${error.message}`);
      conteos[tabla] = count ?? 0;
    }
    return NextResponse.json({ ok: true, modoPruebaPermitido: env.permitirModoPrueba, conteos });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
