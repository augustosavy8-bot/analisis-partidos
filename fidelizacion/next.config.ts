import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La fuente de las imágenes de billetera se lee con fs: la incluimos en las funciones.
  outputFileTracingIncludes: {
    "/t/[local]/franja": ["./assets/**"],
    "/t/[local]/cabecera": ["./assets/**"],
  },
  // Cabeceras de seguridad: que nadie meta el panel en un iframe (clickjacking),
  // que el navegador no adivine tipos, y no filtrar URLs con tokens (/w/…) a otros sitios.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  // Los precios sólo se ven dentro del panel, una vez registrado (ver /panel/facturacion).
  async redirects() {
    return [{ source: "/precios", destination: "/sumate", permanent: false }];
  },
  experimental: {
    // Ícono de notificaciones del panel: PNG de hasta 2 MB + lo que suma el multipart.
    serverActions: { bodySizeLimit: "2200kb" },
  },
};

export default nextConfig;
