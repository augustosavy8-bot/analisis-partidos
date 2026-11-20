import { requerirSuperadmin } from "@/lib/admin";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { fechaHora } from "@/lib/panel";
import { Tarjeta, Titulo, Vacio } from "@/components/Panel";

export const metadata = { title: "Opiniones" };

const estrellas = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

/** Lo que los dueños opinan de Point (cartel del Resumen del panel). */
export default async function Opiniones() {
  await requerirSuperadmin();
  const db = crearClienteAdmin();
  const [{ data: filas, error }, { data: locales }] = await Promise.all([
    db
      .from("opiniones")
      .select("id, local_id, estrellas, comentario, created_at, locales(nombre)")
      .not("estrellas", "is", null)
      .order("created_at", { ascending: false })
      .limit(500),
    db.from("locales").select("id, nombre").eq("activo", true).order("nombre"),
  ]);
  if (error) throw new Error(error.message);

  // La última opinión de cada local es la que cuenta para el promedio.
  const ultima = new Map<string, NonNullable<typeof filas>[number]>();
  for (const f of filas ?? []) if (!ultima.has(f.local_id)) ultima.set(f.local_id, f);
  const vigentes = [...ultima.values()];
  const promedio = vigentes.length ? vigentes.reduce((t, f) => t + (f.estrellas ?? 0), 0) / vigentes.length : 0;
  const sinOpinar = (locales ?? []).filter((l) => !ultima.has(l.id));
  const zona = "America/Argentina/Buenos_Aires";

  return (
    <>
      <Titulo>Opiniones</Titulo>
      <p className="-mt-3 mb-5 text-sm text-stone-500">
        Lo que los dueños contestan en el cartel del Resumen (aparece después de 2 semanas y 20 visitas). Con 1 o 2 estrellas te llega un mail.
      </p>
      {vigentes.length === 0 ? (
        <Vacio>Todavía nadie opinó. El cartel les aparece a los locales con al menos 2 semanas y 20 visitas.</Vacio>
      ) : (
        <>
          <div className="mb-4 flex items-baseline gap-3">
            <span className="text-4xl font-bold tabular-nums">{promedio.toFixed(1).replace(".", ",")}</span>
            <span className="text-lg text-amber-500">{estrellas(Math.round(promedio))}</span>
            <span className="text-sm text-stone-500">
              {vigentes.length} de {(locales ?? []).length} locales respondieron
            </span>
          </div>
          <Tarjeta className="!p-0 overflow-hidden">
            <ul className="divide-y divide-stone-100">
              {(filas ?? []).map((f) => (
                <li key={f.id} className={`flex flex-wrap items-start gap-3 px-4 py-3 ${(f.estrellas ?? 0) <= 2 ? "bg-red-50/60" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{(f.locales as unknown as { nombre: string } | null)?.nombre ?? "—"}</p>
                    {f.comentario && <p className="mt-0.5 whitespace-pre-wrap text-sm text-stone-700">“{f.comentario}”</p>}
                    <p className="text-xs text-stone-400">{fechaHora(f.created_at, zona)}</p>
                  </div>
                  <span className="text-amber-500">{estrellas(f.estrellas ?? 0)}</span>
                </li>
              ))}
            </ul>
          </Tarjeta>
        </>
      )}
      {sinOpinar.length > 0 && <p className="mt-4 text-sm text-stone-500">Sin opinar todavía: {sinOpinar.map((l) => l.nombre).join(", ")}.</p>}
    </>
  );
}
