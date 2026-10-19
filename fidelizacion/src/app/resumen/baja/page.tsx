import { crearClienteAdmin } from "@/lib/supabase/admin";
import { cambiarResumen, leerBaja } from "@/lib/resumen-envio";
import { refresh } from "next/cache";
import { LogoPoint } from "@/components/MarcaPoint";

export const metadata = { title: "Resumen semanal", robots: { index: false } };

async function darDeBaja(form: FormData) {
  "use server";
  const datos = leerBaja(String(form.get("t") ?? ""));
  if (datos) await cambiarResumen(datos.u, datos.l, false);
  refresh();
}

/**
 * Baja del resumen semanal desde el link del mail. Pide un clic (no da de baja al
 * abrir: los antivirus de los mails abren los links solos).
 */
export default async function BajaResumen({ searchParams }: PageProps<"/resumen/baja">) {
  const { t } = await searchParams;
  const token = typeof t === "string" ? t : undefined;
  const datos = leerBaja(token);
  let local: string | null = null;
  let recibe = false;
  if (datos) {
    const db = crearClienteAdmin();
    const [{ data: l }, { data: m }] = await Promise.all([
      db.from("locales").select("nombre").eq("id", datos.l).maybeSingle(),
      db.from("miembros_local").select("resumen_semanal").eq("user_id", datos.u).eq("local_id", datos.l).maybeSingle(),
    ]);
    local = l?.nombre ?? null;
    recibe = Boolean(m?.resumen_semanal);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <LogoPoint alto={28} />
      {!datos || !local ? (
        <p className="text-pt-ink-2">Este link no es válido o ya venció. Podés dejar de recibir el resumen desde Ajustes, en tu panel.</p>
      ) : recibe ? (
        <form action={darDeBaja} className="space-y-4">
          <h1 className="text-2xl font-semibold text-pt-ink">¿Dejás de recibir el resumen de {local}?</h1>
          <p className="text-pt-ink-2">Es el mail de los lunes con las visitas, los clientes nuevos y los que no vuelven. Lo podés volver a activar desde Ajustes.</p>
          <input type="hidden" name="t" value={token} />
          <button type="submit" className="rounded-full bg-pt-ink px-5 py-3 text-sm font-semibold text-white">
            Sí, no lo quiero recibir más
          </button>
        </form>
      ) : (
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-pt-ink">Listo</h1>
          <p className="text-pt-ink-2">Ya no te llega el resumen semanal de {local}. Si cambiás de idea, activalo desde Ajustes en tu panel.</p>
        </div>
      )}
    </main>
  );
}
