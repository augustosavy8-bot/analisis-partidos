import "server-only";
import { after } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { requerirUsuario } from "@/lib/panel";
import { slugDesde } from "@/lib/admin";
import { notificarCambioLocal } from "@/lib/wallet";
import { validarDatosComercio, type DatosComercio } from "./registro";

/** Primera dirección libre para el local: "bar-central", "bar-central-2", ... */
async function slugLibre(nombre: string): Promise<string> {
  const base = (slugDesde(nombre) || "local").slice(0, 52).replace(/-+$/, "");
  const { data } = await crearClienteAdmin().from("locales").select("slug").like("slug", `${base}%`);
  const usados = new Set((data ?? []).map((l) => l.slug));
  if (!usados.has(base)) return base;
  for (let n = 2; n < 1000; n++) if (!usados.has(`${base}-${n}`)) return `${base}-${n}`;
  return `${base}-${Date.now().toString(36)}`;
}

/**
 * Si el usuario se registró solo y todavía no tiene comercio, lo crea ahora
 * (con su primer local) a partir de los datos que dejó al registrarse.
 * Devuelve el id del comercio creado, o null si no había nada pendiente.
 * Se puede llamar en cada visita: si ya existe, no hace nada.
 */
export async function completarRegistroPendiente(): Promise<string | null> {
  const { db, userId, email } = await requerirUsuario();
  const { data: propios } = await db.from("comercios").select("id").eq("owner_user_id", userId).limit(1);
  if (propios?.length) return null;

  const { data } = await db.auth.getUser();
  const registro = data.user?.user_metadata?.registro as Record<string, unknown> | undefined;
  if (!registro) return null;

  // Los metadatos los escribió el navegador del usuario: se vuelven a validar acá.
  const r = validarDatosComercio(registro);
  if ("error" in r) {
    console.error("Registro pendiente inválido", userId, r.error);
    return null;
  }

  return crearComercio(userId, email, r.datos);
}

/**
 * Crea el comercio del usuario con su primer local (dirección /t/... libre).
 * Lo usan el registro con email (al confirmar) y el de Google (pantalla
 * "Contanos de tu comercio"). Devuelve el id, o null si no se pudo.
 */
export async function crearComercio(userId: string, email: string, datos: DatosComercio): Promise<string | null> {
  const admin = crearClienteAdmin();
  for (let intento = 0; intento < 3; intento++) {
    const slug = await slugLibre(datos.comercio);
    const { data: comercioId, error } = await admin.rpc("completar_registro", {
      p_user: userId,
      p_comercio: datos.comercio,
      p_rubro: datos.rubro,
      p_slug: slug,
      p_razon_social: datos.razonSocial ?? "",
      p_cuit: datos.cuit ?? "",
      p_condicion_fiscal: datos.condicionFiscal ?? "",
      p_email: email,
    });
    if (!error && comercioId) {
      const { data: local } = await admin.from("locales").select("id").eq("comercio_id", comercioId).limit(1).maybeSingle();
      if (local) after(() => notificarCambioLocal(local.id));
      return comercioId as string;
    }
    // Otro registro tomó la misma dirección en el mismo instante: probamos con la siguiente.
    if (error?.code !== "23505") {
      console.error("No se pudo completar el registro", userId, error?.message);
      return null;
    }
  }
  return null;
}

/** Plan que eligió en la página de precios (si lo hizo). */
export async function planElegidoAlRegistrarse(): Promise<string | null> {
  const { db } = await requerirUsuario();
  const { data } = await db.auth.getUser();
  const plan = (data.user?.user_metadata?.registro as Record<string, unknown> | undefined)?.plan;
  return typeof plan === "string" && /^[a-z0-9_]{2,30}$/.test(plan) ? plan : null;
}
