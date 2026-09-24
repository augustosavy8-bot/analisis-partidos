import { ImageResponse } from "next/og";
import { buscarLocal, colorTextoSobre } from "@/lib/locales";

/** Ícono de la PWA generado con los colores e inicial del local. */
export async function GET(req: Request, { params }: RouteContext<"/t/[local]/icono">) {
  const { local: slug } = await params;
  const local = await buscarLocal(slug);
  if (!local) return new Response("No existe", { status: 404 });

  const pedido = Number(new URL(req.url).searchParams.get("s")) || 192;
  const s = Math.min(512, Math.max(64, Math.round(pedido)));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: local.color_primario,
        }}
      >
        <div
          style={{
            width: s * 0.56,
            height: s * 0.56,
            borderRadius: s * 0.16,
            background: local.color_secundario,
            color: colorTextoSobre(local.color_secundario) === "#ffffff" ? "#ffffff" : local.color_primario,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: s * 0.32,
            fontWeight: 700,
          }}
        >
          {local.nombre.charAt(0).toUpperCase()}
        </div>
      </div>
    ),
    { width: s, height: s, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
