import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { validarChipPrueba, type ResultadoChip } from "@/lib/chips";
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
 *   Producción (fase 3): /n?p=<PICCData>&m=<CMAC>
 */
export async function GET(req: NextRequest) {
  const ir = (ruta: string) => NextResponse.redirect(new URL(ruta, req.url), 303);

  const t = req.nextUrl.searchParams.get("t");
  let chip: ResultadoChip;
  if (t) {
    if (!env.permitirModoPrueba) return ir("/aviso?m=modo_prueba_off");
    chip = await validarChipPrueba(t);
  } else {
    chip = { ok: false, motivo: "chip_invalido" };
  }
  if (!chip.ok) return ir(`/aviso?m=${chip.motivo}`);

  const cliente = await clienteDesdeToken(req.cookies.get(COOKIE_DISPOSITIVO)?.value);

  if (!cliente) {
    // Primera vez: guardamos el toque firmado y mandamos al formulario.
    const res = ir(`/registro?l=${chip.toque.localSlug}`);
    res.cookies.set(COOKIE_TOQUE, firmarToquePendiente(chip.toque), opcionesCookie(DURACION_TOQUE_PENDIENTE));
    return res;
  }

  const resultado = await aplicarToque(cliente.clienteId, chip.toque);
  return ir(urlResultado(chip.toque.localSlug, resultado));
}
