import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";

/** Registra un toque rechazado (best-effort: nunca rompe el flujo del cliente). */
export async function registrarRechazo(r: {
  motivo: string;
  origen: "nfc" | "qr";
  localId?: string | null;
  chipId?: string | null;
}) {
  try {
    await crearClienteAdmin()
      .from("rechazos")
      .insert({ motivo: r.motivo.slice(0, 40), origen: r.origen, local_id: r.localId ?? null, chip_id: r.chipId ?? null });
  } catch {}
}
