"use server";

import { refresh } from "next/cache";
import { requerirSuperadmin } from "@/lib/admin";

export async function cambiarEstadoInteresado(id: number, estado: "nuevo" | "contactado" | "descartado") {
  const { db } = await requerirSuperadmin();
  if (!Number.isInteger(id) || !["nuevo", "contactado", "descartado"].includes(estado)) return;
  await db.from("interesados").update({ estado }).eq("id", id);
  refresh();
}
