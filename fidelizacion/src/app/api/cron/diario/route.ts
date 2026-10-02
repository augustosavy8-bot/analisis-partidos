import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { conciliar } from "@/lib/facturacion/conciliacion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Compara en tiempo constante (hash primero: así los largos distintos no se notan). */
function igual(a: string, b: string) {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

/**
 * Tarea diaria (Vercel Cron, ver vercel.json). Vercel manda
 * "Authorization: Bearer <CRON_SECRET>"; cualquier otra llamada recibe 401.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!igual(auth, `Bearer ${env.cronSecret}`)) return new NextResponse(null, { status: 401 });
  const reporte = await conciliar();
  if (reporte.errores.length) console.error("Conciliación con errores", reporte.errores);
  return NextResponse.json(reporte);
}
