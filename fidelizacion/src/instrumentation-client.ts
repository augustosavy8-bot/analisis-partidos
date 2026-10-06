import * as Sentry from "@sentry/nextjs";

// Errores en el navegador (tarjeta del cliente, panel). Sin DSN no hace nada.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
    tracesSampleRate: 0,
    // Nada de datos personales ni secretos: ni cookies, ni headers, ni cuerpos, ni la query
    // (ahí viajan los tokens de los llaveros y de Wallet), ni variables de los stack frames.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      genAI: { inputs: false, outputs: false },
      stackFrameVariables: false,
    },
    // Ruido de extensiones y navegadores viejos que no son errores de Point.
    ignoreErrors: ["ResizeObserver loop", "Non-Error promise rejection", "Load failed", "Failed to fetch"],
  });
}
