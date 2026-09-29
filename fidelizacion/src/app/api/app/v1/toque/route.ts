import { clienteDeRequest, error, json } from "@/lib/app/servidor";
import { aplicarToqueApp, ErrorToque, pedirRegistro, usarToquePendiente, validarToqueApp } from "@/lib/app/toque-app";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PARAMS = ["p", "m", "picc_data", "cmac", "t", "q"] as const;

/**
 * El llavero (o el QR de respaldo) abrió la app: misma validación antifraude que /n.
 *   { params: { p, m } | { t } | { q } }  → toque recién hecho
 *   { toquePendiente }                    → el toque que quedó esperando mientras el cliente entraba
 * Con sesión aplica el toque; sin sesión devuelve el toque firmado para registrarse.
 */
export async function POST(req: Request) {
  const cuerpo = (await req.json().catch(() => null)) as { params?: Record<string, unknown>; toquePendiente?: unknown } | null;
  const cliente = await clienteDeRequest(req);
  try {
    if (cuerpo?.toquePendiente !== undefined) {
      if (!cliente) return error("Tu sesión venció. Volvé a entrar.", 401);
      return json(await aplicarToqueApp(cliente.clienteId, await usarToquePendiente(cuerpo.toquePendiente)));
    }
    const sp = new URLSearchParams();
    for (const k of PARAMS) {
      const v = cuerpo?.params?.[k];
      if (typeof v === "string" && v.length <= 200) sp.set(k, v);
    }
    const toque = await validarToqueApp(sp);
    return json(cliente ? await aplicarToqueApp(cliente.clienteId, toque) : await pedirRegistro(toque));
  } catch (e) {
    if (e instanceof ErrorToque) return json({ error: e.message, titulo: e.titulo, motivo: e.motivo }, e.status);
    console.error("App: error en el toque", e instanceof Error ? e.message : "error");
    return error("Algo salió mal. Pedile que vuelva a apoyar el llavero.", 500);
  }
}
