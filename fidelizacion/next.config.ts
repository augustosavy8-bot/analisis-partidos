import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La fuente de las imágenes de billetera se lee con fs: la incluimos en las funciones.
  outputFileTracingIncludes: {
    "/t/[local]/franja": ["./assets/**"],
    "/t/[local]/cabecera": ["./assets/**"],
  },
  // Cabeceras de seguridad: que nadie meta el panel en un iframe (clickjacking)
  // y que el navegador no adivine tipos.
  async headers() {
    return [
      {
        // Las páginas con el formulario de tarjeta de Mercado Pago quedan afuera:
        // no arriesgamos que una cabecera rompa sus iframes (Secure Fields).
        source: "/((?!panel/facturacion|panel/kit).*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          // Sin Permissions-Policy ni Referrer-Policy: con esas cabeceras el formulario
          // de tarjeta de Mercado Pago (Secure Fields, iframes) dejó de cargar
          // ("fields_setup_failed"). El Referrer-Policy del navegador ya es estricto.
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
