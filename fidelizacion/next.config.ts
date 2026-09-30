import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La fuente de las imágenes de billetera se lee con fs: la incluimos en las funciones.
  outputFileTracingIncludes: {
    "/t/[local]/franja": ["./assets/**"],
    "/t/[local]/cabecera": ["./assets/**"],
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
