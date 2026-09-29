import { autorizarPase, vacio } from "@/lib/wallet/apple-servicio";
import { generarPkpass } from "@/lib/wallet/apple";
import { noModificado, ultimaModificacion } from "@/lib/wallet/apple-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** El pase actualizado (con Last-Modified; 304 si no cambió desde If-Modified-Since). */
export async function GET(req: Request, { params }: RouteContext<"/api/apple-wallet/v1/passes/[passTypeId]/[serial]">) {
  const { passTypeId, serial } = await params;
  const { pase, error } = await autorizarPase(req, passTypeId, serial);
  if (error) return error;

  const actualizado = new Date(pase.updated_at);
  const lastModified = ultimaModificacion(actualizado).toUTCString();
  if (noModificado(actualizado, req.headers.get("if-modified-since"))) return vacio(304, { "Last-Modified": lastModified });

  try {
    const pkpass = await generarPkpass(pase);
    return new Response(new Uint8Array(pkpass), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Last-Modified": lastModified,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("Apple Wallet: no se pudo generar el pase actualizado", e instanceof Error ? e.message : "error");
    return vacio(500);
  }
}
