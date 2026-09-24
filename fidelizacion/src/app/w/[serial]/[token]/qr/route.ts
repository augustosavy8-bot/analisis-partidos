import QRCode from "qrcode";
import { tarjetaPorPase, urlBilletera } from "@/lib/billetera";

/** QR (PNG) del link personal de la tarjeta, para importar en la app de billetera. */
export async function GET(_req: Request, { params }: RouteContext<"/w/[serial]/[token]/qr">) {
  const { serial, token } = await params;
  const pase = await tarjetaPorPase(serial, token);
  if (!pase) return new Response("No existe", { status: 404 });
  const png = await QRCode.toBuffer(urlBilletera(serial, token), { width: 720, margin: 2, errorCorrectionLevel: "M" });
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="tarjeta-${pase.local.slug}.png"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
