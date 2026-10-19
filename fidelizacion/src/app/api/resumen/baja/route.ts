import { NextResponse } from "next/server";
import { cambiarResumen, leerBaja } from "@/lib/resumen-envio";

export const runtime = "nodejs";

/** Baja con un clic desde Gmail/Outlook (List-Unsubscribe-Post, RFC 8058). */
export async function POST(req: Request) {
  const datos = leerBaja(new URL(req.url).searchParams.get("t") ?? undefined);
  if (!datos) return NextResponse.json({ ok: false }, { status: 400 });
  const ok = await cambiarResumen(datos.u, datos.l, false);
  return NextResponse.json({ ok }, { status: ok ? 200 : 500 });
}
