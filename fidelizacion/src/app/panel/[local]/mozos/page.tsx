import Link from "next/link";
import { requerirLocal } from "@/lib/panel";
import { Tarjeta, Titulo, Vacio } from "@/components/Panel";
import { AccionesMozo, FormNuevoMozo } from "./Formularios";
import { formasTermino } from "@/lib/terminos";

export const metadata = { title: "Equipo" };

export default async function Mozos({ params }: PageProps<"/panel/[local]/mozos">) {
  const { local: slug } = await params;
  const { db, local } = await requerirLocal(slug);
  const t = formasTermino(local.termino_personal);
  const [{ data: mozos }, { data: chips }] = await Promise.all([
    db.from("mozos").select("id, nombre, activo").eq("local_id", local.id).order("activo", { ascending: false }).order("nombre"),
    db.from("chips").select("id, uid, etiqueta, modo, mozo_id, activo").eq("local_id", local.id),
  ]);

  return (
    <>
      <Titulo>{t.Plural}</Titulo>
      <Tarjeta className="mb-4">
        <h2 className="mb-3 font-medium">Nuevo {t.singular}</h2>
        <FormNuevoMozo slug={slug} />
        <p className="mt-3 text-xs text-stone-500">
          El PIN lo usa para mostrar el QR de respaldo en{" "}
          <Link href={`/mozo/${slug}`} className="underline">/mozo/{slug}</Link>. Los llaveros los da de alta el administrador.
        </p>
      </Tarjeta>

      {!mozos?.length ? (
        <Vacio>Todavía no hay {t.plural}.</Vacio>
      ) : (
        <Tarjeta className="!p-0 overflow-hidden">
          <ul className="divide-y divide-stone-100">
            {mozos.map((m) => {
              const suyos = (chips ?? []).filter((c) => c.mozo_id === m.id);
              return (
                <li key={m.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${m.activo ? "" : "opacity-60"}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {m.nombre}
                      {!m.activo && <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">inactivo</span>}
                    </p>
                    <p className="text-sm text-stone-500">
                      {suyos.length === 0
                        ? "Sin llavero asignado"
                        : suyos.map((c) => `${c.etiqueta ?? c.uid}${c.modo === "prueba" ? " (prueba)" : ""}`).join(", ")}
                    </p>
                  </div>
                  <AccionesMozo slug={slug} id={m.id} activo={m.activo} />
                </li>
              );
            })}
          </ul>
        </Tarjeta>
      )}
      <p className="mt-3 text-sm text-stone-500">
        Un {t.singular} desactivado no puede sumar puntos ni con el llavero ni con el QR. Su historial se conserva.
      </p>
    </>
  );
}
