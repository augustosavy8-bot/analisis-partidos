import { clienteDeRequest, eliminarCuenta, error, json } from "@/lib/app/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Eliminar mi cuenta" (lo exige Apple): borra al cliente con todas sus tarjetas,
 * puntos, historial, canjes, celulares vinculados y pases. No se puede deshacer.
 */
export async function DELETE(req: Request) {
  const cliente = await clienteDeRequest(req);
  if (!cliente) return error("Tu sesión venció. Volvé a entrar.", 401);
  // Un celular recién vinculado a una cuenta que ya existía todavía no prueba que
  // sea del dueño (no hay código por WhatsApp): no puede borrarla en las primeras 24 hs.
  if (cliente.recienVinculado) {
    return error("Por seguridad, podés eliminar la cuenta desde este celular 24 horas después de haberla vinculado.", 403);
  }
  try {
    await eliminarCuenta(cliente.clienteId);
    return json({ ok: true });
  } catch (e) {
    console.error("App: no se pudo eliminar la cuenta", e instanceof Error ? e.message : "error");
    return error("No pudimos eliminar tu cuenta. Probá de nuevo o escribinos.", 500);
  }
}
