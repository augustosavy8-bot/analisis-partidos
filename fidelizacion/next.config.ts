import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La fuente de las imágenes de billetera se lee con fs: la incluimos en las funciones.
  outputFileTracingIncludes: {
    "/t/[local]/franja": ["./assets/**"],
    "/t/[local]/cabecera": ["./assets/**"],
  },
};

export default nextConfig;
