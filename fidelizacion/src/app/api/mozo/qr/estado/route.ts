import { NextResponse, type NextRequest } from "next/server";
import { mozoActual } from "@/lib/sesion-mozo";
import { qrFueUsado } from "@/lib/qr";

export const dynamic = "force-dynamic";

/** ¿Ya se escaneó este QR? La pantalla del mozo lo consulta para mostrar el ✓. */
export async function GET(req: NextRequest) {
  if (!(await mozoActual())) return NextResponse.json({ error: "sin_sesion" }, { status: 401 });
  const j = req.nextUrl.searchParams.get("j") ?? "";
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(j)) return NextResponse.json({ usado: false });
  return NextResponse.json({ usado: await qrFueUsado(j) }, { headers: { "Cache-Control": "no-store" } });
}
