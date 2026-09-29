import { NextResponse, after, type NextRequest } from "next/server";
import { validarEntradaToque } from "@/lib/entrada-toque";
import { registrarRechazo } from "@/lib/rechazos";
import {
  COOKIE_DISPOSITIVO,
  COOKIE_TOQUE,
  clienteDesdeToken,
  opcionesCookie,
} from "@/lib/dispositivo";
import {
  DURACION_TOQUE_PENDIENTE,
  aplicarToque,
  firmarToquePendiente,
  urlResultado,
} from "@/lib/toque";

export const dynamic = "force-dynamic";

/**
 * Punto de entrada del toque NFC. El chip abre esta URL en el celular del cliente.
 *   Modo prueba: /n?t=<token>
 *   QR de respaldo del mozo: /n?q=<token firmado, un solo uso>
 *   Producción (NTAG 424 DNA, SUN): /n?p=<PICCData>&m=<CMAC>  (también picc_data/cmac)
 */
export async function GET(req: NextRequest) {
  const ir = (ruta: string) => NextResponse.redirect(new URL(ruta, req.url), 303);

  // El chip y el celular se validan en paralelo (son independientes).
  const [{ chip, origen }, cliente] = await Promise.all([
    validarEntradaToque(req.nextUrl.searchParams),
    clienteDesdeToken(req.cookies.get(COOKIE_DISPOSITIVO)?.value),
  ]);
  if (!chip.ok && chip.motivo === "modo_prueba_off") return ir("/aviso?m=modo_prueba_off");
  if (!chip.ok) {
    after(() => registrarRechazo({ motivo: chip.motivo, origen, localId: chip.localId, chipId: chip.chipId }));
    return ir(`/aviso?m=${chip.motivo}`);
  }

  if (!cliente) {
    // Primera vez: guardamos el toque firmado y mandamos al formulario.
    const res = ir(`/registro?l=${chip.toque.localSlug}`);
    res.cookies.set(COOKIE_TOQUE, firmarToquePendiente(chip.toque), opcionesCookie(DURACION_TOQUE_PENDIENTE));
    return res;
  }

  const resultado = await aplicarToque(cliente.clienteId, chip.toque);
  if (resultado.tipo === "limite" || resultado.tipo === "error") {
    const motivo = resultado.tipo === "limite" ? "limite" : resultado.motivo;
    after(() => registrarRechazo({ motivo, origen, localId: chip.toque.localId, chipId: chip.toque.chipId }));
  }
  return ir(urlResultado(chip.toque.localSlug, resultado));
}
