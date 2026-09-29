import "server-only";
import { env } from "@/lib/env";
import { validarChipPrueba, validarChipSun, type ResultadoChip } from "@/lib/chips";
import { validarQR } from "@/lib/qr";
import type { Origen } from "@/lib/toque";

/**
 * Valida los parámetros con los que llega un toque (la URL del chip o del QR),
 * igual para la web (/n) y la app:
 *   Modo prueba: t=<token> · QR de respaldo: q=<token> · SUN (NTAG 424 DNA): p=<PICCData>&m=<CMAC>
 */
export async function validarEntradaToque(sp: URLSearchParams): Promise<{ chip: ResultadoChip; origen: Origen }> {
  const t = sp.get("t");
  const q = sp.get("q");
  const picc = sp.get("p") ?? sp.get("picc_data");
  const mac = sp.get("m") ?? sp.get("cmac");
  const origen: Origen = q ? "qr" : "nfc";
  if (!(picc && mac) && !q && t && !env.permitirModoPrueba) return { chip: { ok: false, motivo: "modo_prueba_off" }, origen };
  const chip: ResultadoChip =
    picc && mac ? await validarChipSun(picc, mac) : q ? await validarQR(q) : t ? await validarChipPrueba(t) : { ok: false, motivo: "chip_invalido" };
  return { chip, origen };
}
