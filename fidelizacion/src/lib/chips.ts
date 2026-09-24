import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/dispositivo";
import type { Toque } from "@/lib/toque";
import { env } from "@/lib/env";
import { descifrarClaveChip } from "@/lib/cifrado";
import { descifrarPICC, verificarMacSun } from "@/lib/sun";

export type ResultadoChip = { ok: true; toque: Toque } | { ok: false; motivo: string; chipId?: string; localId?: string };

/** Valida un chip en modo prueba (URL estática /n?t=<token>). */
export async function validarChipPrueba(token: string): Promise<ResultadoChip> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return { ok: false, motivo: "chip_invalido" };
  const db = crearClienteAdmin();
  const { data: chip } = await db
    .from("chips")
    .select("id, mozo_id, activo, modo, locales(id, slug, activo), mozos(activo)")
    .eq("token_prueba_hash", hashToken(token))
    .maybeSingle();

  if (!chip || chip.modo !== "prueba" || !chip.activo) return { ok: false, motivo: "chip_invalido" };
  const local = chip.locales as unknown as { id: string; slug: string; activo: boolean };
  const mozo = chip.mozos as unknown as { activo: boolean } | null;
  if (!local.activo) return { ok: false, motivo: "local_inactivo" };
  if (!chip.mozo_id || !mozo?.activo) return { ok: false, motivo: "chip_sin_mozo" };

  void db.from("chips").update({ ultimo_uso: new Date().toISOString() }).eq("id", chip.id).then();
  return {
    ok: true,
    toque: { localId: local.id, localSlug: local.slug, mozoId: chip.mozo_id, chipId: chip.id, origen: "nfc" },
  };
}

/**
 * Valida un toque de NTAG 424 DNA (SUN, AN12196):
 * descifra PICCData → busca el chip por UID → verifica el CMAC con su clave →
 * acepta el contador sólo si es mayor al último visto (anti-replay atómico).
 */
export async function validarChipSun(piccHex: string, macHex: string): Promise<ResultadoChip> {
  let metaKey: Buffer;
  try {
    metaKey = env.sdmMetaKey;
  } catch {
    return { ok: false, motivo: "sun_sin_configurar" };
  }
  const picc = descifrarPICC(piccHex, metaKey);
  if (!picc) return { ok: false, motivo: "sun_invalido" };

  const db = crearClienteAdmin();
  const { data: chip } = await db
    .from("chips")
    .select("id, mozo_id, activo, modo, clave_aes_cifrada, locales(id, slug, activo), mozos(activo)")
    .eq("uid", picc.uid)
    .maybeSingle();
  if (!chip || chip.modo !== "produccion" || !chip.clave_aes_cifrada) return { ok: false, motivo: "chip_invalido" };
  const local = chip.locales as unknown as { id: string; slug: string; activo: boolean };
  const ctx = { chipId: chip.id, localId: local.id };
  if (!chip.activo) return { ok: false, motivo: "chip_invalido", ...ctx };

  let clave: Buffer;
  try {
    clave = descifrarClaveChip(chip.clave_aes_cifrada, env.chipsMasterKey);
  } catch {
    return { ok: false, motivo: "sun_sin_configurar", ...ctx };
  }
  if (!verificarMacSun(clave, picc, macHex)) return { ok: false, motivo: "sun_cmac", ...ctx };

  const { data: nuevo } = await db.rpc("consumir_contador_chip", { p_chip_id: chip.id, p_contador: picc.contador });
  if (nuevo !== true) return { ok: false, motivo: "sun_repetido", ...ctx };

  const mozo = chip.mozos as unknown as { activo: boolean } | null;
  if (!local.activo) return { ok: false, motivo: "local_inactivo", ...ctx };
  if (!chip.mozo_id || !mozo?.activo) return { ok: false, motivo: "chip_sin_mozo", ...ctx };

  return {
    ok: true,
    toque: { localId: local.id, localSlug: local.slug, mozoId: chip.mozo_id, chipId: chip.id, origen: "nfc" },
  };
}
