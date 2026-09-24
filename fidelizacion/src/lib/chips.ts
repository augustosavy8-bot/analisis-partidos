import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/dispositivo";
import type { Toque } from "@/lib/toque";

export type ResultadoChip = { ok: true; toque: Toque } | { ok: false; motivo: string };

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
