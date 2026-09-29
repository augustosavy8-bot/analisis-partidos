import { clienteDeRequest, error, json, tarjetasDelCliente } from "@/lib/app/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** "Mis tarjetas": los locales donde el cliente tiene tarjeta. */
export async function GET(req: Request) {
  const cliente = await clienteDeRequest(req);
  if (!cliente) return error("Tu sesión venció. Volvé a entrar.", 401);
  return json({ nombre: cliente.nombre, tarjetas: await tarjetasDelCliente(cliente.clienteId) });
}
