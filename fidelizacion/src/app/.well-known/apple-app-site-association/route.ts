import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Bundle ID de la app de Point (app-mobile/app.json → ios.bundleIdentifier). */
const BUNDLE_ID = "com.point.fidelizacion";

/**
 * Enlaces universales de iOS: el toque del llavero (/n?…) abre la app de Point si
 * está instalada; si no, sigue abriendo la web como siempre. El Team ID es el de la
 * cuenta de Apple (APPLE_APP_TEAM_ID, o APPLE_TEAM_ID de Apple Wallet).
 */
export function GET() {
  const teamId = (process.env.APPLE_APP_TEAM_ID ?? env.appleWallet?.teamId ?? "").trim();
  if (!/^[A-Z0-9]{10}$/.test(teamId)) return new Response("No configurado", { status: 404 });
  return Response.json(
    {
      applinks: {
        details: [
          {
            appIDs: [`${teamId}.${BUNDLE_ID}`],
            components: [
              { "/": "/n", comment: "Toque del llavero o QR de respaldo: suma en la app" },
              { "/": "/n/*" },
            ],
          },
        ],
      },
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
