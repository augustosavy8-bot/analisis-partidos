import * as Sentry from "@sentry/nextjs";

/**
 * Sentry (alertas de errores). Sin NEXT_PUBLIC_SENTRY_DSN no hace nada: se activa al
 * conectar la integración de Sentry en Vercel. Captura los errores que explotan y
 * también los console.error del servidor (ahí registramos los problemas que se
 * manejan, como un webhook de Mercado Pago fallido o un cambio de plan a medias).
 */
export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? "development",
    tracesSampleRate: 0.05,
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
    integrations: [Sentry.captureConsoleIntegration({ levels: ["error"] })],
  });
}

export const onRequestError = Sentry.captureRequestError;
