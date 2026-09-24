import { NextResponse } from "next/server";
import { buscarLocal } from "@/lib/locales";

/** Manifest PWA por local: cada tarjeta se instala con el nombre y colores del local. */
export async function GET(_req: Request, { params }: RouteContext<"/t/[local]/manifest.webmanifest">) {
  const { local: slug } = await params;
  const local = await buscarLocal(slug);
  if (!local) return new NextResponse("No existe", { status: 404 });

  return NextResponse.json(
    {
      id: `/t/${slug}`,
      name: `${local.nombre} · Mi tarjeta`,
      short_name: local.nombre,
      description: `Tu tarjeta de puntos de ${local.nombre}`,
      start_url: `/t/${slug}`,
      scope: `/t/${slug}`,
      display: "standalone",
      background_color: "#fafaf9",
      theme_color: local.color_primario,
      lang: "es-AR",
      icons: [
        { src: `/t/${slug}/icono?s=192`, sizes: "192x192", type: "image/png" },
        { src: `/t/${slug}/icono?s=512`, sizes: "512x512", type: "image/png" },
        { src: `/t/${slug}/icono?s=512`, sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } },
  );
}
