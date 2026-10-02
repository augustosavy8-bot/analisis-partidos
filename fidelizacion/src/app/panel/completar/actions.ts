"use server";

import { redirect } from "next/navigation";
import { requerirUsuario } from "@/lib/panel";
import { validarDatosComercio } from "@/lib/facturacion/registro";
import { crearComercio } from "@/lib/facturacion/registro-servidor";

export type EstadoCompletar = { error?: string; valores?: Record<string, string> };

/** Entró con Google y no tiene comercio: lo crea con lo que cargó en "Contanos de tu comercio". */
export async function completarComercio(_prev: EstadoCompletar, form: FormData): Promise<EstadoCompletar> {
  const { db, userId, email } = await requerirUsuario();
  const valores = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  const r = validarDatosComercio(valores);
  if ("error" in r) return { error: r.error, valores };

  // Doble envío o ya tenía comercio: no se crea otro.
  const { data: propios } = await db.from("comercios").select("id").eq("owner_user_id", userId).limit(1);
  if (!propios?.length) {
    const id = await crearComercio(userId, email, r.datos);
    if (!id) return { error: "No pudimos crear tu comercio. Probá de nuevo en un rato.", valores };
  }
  const plan = /^[a-z0-9_]{2,30}$/.test(valores.plan ?? "") ? `&plan=${valores.plan}` : "";
  redirect(`/panel/facturacion?nueva=1${plan}`);
}
