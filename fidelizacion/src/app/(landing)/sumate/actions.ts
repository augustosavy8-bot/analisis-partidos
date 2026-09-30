"use server";

import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { validarRegistro } from "@/lib/facturacion/registro";

export type EstadoRegistro = { error?: string; enviado?: string; valores?: Record<string, string> };

/**
 * Alta del dueño en Supabase Auth con verificación de email. El comercio y su
 * local NO se crean acá: se crean recién cuando confirma el email (primer
 * ingreso al panel). Así un email mal escrito o un bot no dejan comercios
 * fantasma ocupando direcciones (/t/tu-local).
 */
export async function registrarComercio(_prev: EstadoRegistro, form: FormData): Promise<EstadoRegistro> {
  const entrada = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  const { password: _omitida, ...valores } = entrada;
  void _omitida;

  // Campo trampa: los bots lo completan, las personas no lo ven.
  if (entrada.sitio) return { enviado: entrada.email ?? "" };

  const r = validarRegistro(entrada);
  if ("error" in r) return { error: r.error, valores };
  const d = r.datos;

  const db = await crearClienteServidor();
  const { data, error } = await db.auth.signUp({
    email: d.email,
    password: d.password,
    options: {
      emailRedirectTo: `${env.appUrl}/auth/callback?next=/panel/facturacion&tipo=registro`,
      // Se guardan en el usuario hasta que confirme; el servidor los vuelve a validar al usarlos.
      data: {
        nombre: d.nombre,
        registro: {
          comercio: d.comercio,
          rubro: d.rubro,
          razon_social: d.razonSocial,
          cuit: d.cuit,
          condicion_fiscal: d.condicionFiscal,
          plan: d.plan,
        },
      },
    },
  });

  if (error) {
    if (/rate limit|too many/i.test(error.message)) return { error: "Hubo muchos intentos. Esperá unos minutos y probá de nuevo.", valores };
    if (/password/i.test(error.message)) return { error: "Elegí una contraseña más segura (mezclá letras y números).", valores };
    return { error: "No pudimos crear la cuenta. Probá de nuevo en un rato.", valores };
  }
  // Si la confirmación de email estuviera desactivada, ya hay sesión: directo al panel.
  if (data.session) redirect("/panel/facturacion");
  // Si el email ya tenía cuenta, Supabase responde igual (no revela quién está registrado).
  return { enviado: d.email };
}
