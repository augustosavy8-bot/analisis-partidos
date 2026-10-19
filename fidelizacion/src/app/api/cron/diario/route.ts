import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { conciliar } from "@/lib/facturacion/conciliacion";
import { enviarResumenes, esLunes } from "@/lib/resumen-envio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Compara en tiempo constante (hash primero: así los largos distintos no se notan). */
function igual(a: string, b: string) {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

/**
 * Tarea diaria (Vercel Cron, ver vercel.json: 12:00 UTC = 9:00 en Argentina).
 * Concilia los cobros y, los lunes, manda el resumen semanal a los dueños. Vercel manda
 * "Authorization: Bearer <CRON_SECRET>"; cualquier otra llamada recibe 401.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!igual(auth, `Bearer ${env.cronSecret}`)) return new NextResponse(null, { status: 401 });
  const reporte = await conciliar();
  if (reporte.errores.length) console.error("Conciliación con errores", reporte.errores);
  const resumenes = esLunes(new Date()) ? await enviarResumenes() : null;
  if (resumenes && ("error" in resumenes || resumenes.fallidos)) console.error("Resumen semanal", resumenes);
  return NextResponse.json({ ...reporte, resumenes });
}
