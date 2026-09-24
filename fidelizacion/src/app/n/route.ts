import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { validarChipPrueba, validarChipSun, type ResultadoChip } from "@/lib/chips";
import { validarQR } from "@/lib/qr";
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

  const t = req.nextUrl.searchParams.get("t");
  const q = req.nextUrl.searchParams.get("q");
  const sp = req.nextUrl.searchParams;
  const picc = sp.get("p") ?? sp.get("picc_data");
  const mac = sp.get("m") ?? sp.get("cmac");
  let chip: ResultadoChip;
  if (picc && mac) {
    chip = await validarChipSun(picc, mac);
  } else if (q) {
    chip = await validarQR(q);
  } else if (t) {
    if (!env.permitirModoPrueba) return ir("/aviso?m=modo_prueba_off");
    chip = await validarChipPrueba(t);
  } else {
    chip = { ok: false, motivo: "chip_invalido" };
  }
  const origen = q ? "qr" : "nfc";
  if (!chip.ok) {
    await registrarRechazo({ motivo: chip.motivo, origen, localId: chip.localId, chipId: chip.chipId });
    return ir(`/aviso?m=${chip.motivo}`);
  }

  const cliente = await clienteDesdeToken(req.cookies.get(COOKIE_DISPOSITIVO)?.value);

  if (!cliente) {
    // Primera vez: guardamos el toque firmado y mandamos al formulario.
    const res = ir(`/registro?l=${chip.toque.localSlug}`);
    res.cookies.set(COOKIE_TOQUE, firmarToquePendiente(chip.toque), opcionesCookie(DURACION_TOQUE_PENDIENTE));
    return res;
  }

  const resultado = await aplicarToque(cliente.clienteId, chip.toque);
  if (resultado.tipo === "limite" || resultado.tipo === "error") {
    await registrarRechazo({
      motivo: resultado.tipo === "limite" ? "limite" : resultado.motivo,
      origen,
      localId: chip.toque.localId,
      chipId: chip.toque.chipId,
    });
  }
  return ir(urlResultado(chip.toque.localSlug, resultado));
}
