export const runtime = "nodejs";

/** Errores que reporta el iPhone sobre nuestros pases (sin datos del cliente). */
export async function POST(req: Request) {
  try {
    const { logs } = (await req.json()) as { logs?: unknown };
    if (Array.isArray(logs)) {
      for (const l of logs.slice(0, 20)) console.warn("Apple Wallet (iPhone):", String(l).slice(0, 500));
    }
  } catch {}
  return new Response(null, { status: 200 });
}
