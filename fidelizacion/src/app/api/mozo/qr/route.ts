import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { mozoActual } from "@/lib/sesion-mozo";
import { emitirQR } from "@/lib/qr";

export const dynamic = "force-dynamic";

/** Emite un QR nuevo (firmado, un solo uso) para el mozo logueado. */
export async function GET() {
  const mozo = await mozoActual();
  if (!mozo) return NextResponse.json({ error: "sin_sesion" }, { status: 401 });

  const qr = emitirQR(mozo);
  const svg = await QRCode.toString(qr.url, { type: "svg", errorCorrectionLevel: "L", margin: 1 });
  return NextResponse.json({ ...qr, svg }, { headers: { "Cache-Control": "no-store" } });
}
