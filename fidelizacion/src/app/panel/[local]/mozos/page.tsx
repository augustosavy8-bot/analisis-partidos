import Link from "next/link";
import { requerirLocal } from "@/lib/panel";
import { Tarjeta, Titulo, Vacio } from "@/components/Panel";
import { AccionesMozo, FormNuevoMozo } from "./Formularios";
import { formasTermino } from "@/lib/terminos";
import { claseBoton } from "@/components/app/Boton";
import { Insignia } from "@/components/app/Superficie";

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
      <Titulo detalle={`Quién suma puntos con el llavero o el QR de respaldo.`}>{t.Plural}</Titulo>
      <Tarjeta className="mb-4">
        <h2 id="nuevo" className="pt-app-seccion mb-3 text-pt-ink">Nuevo {t.singular}</h2>
        <FormNuevoMozo slug={slug} />
        <p className="mt-3 pt-app-detalle text-pt-ink-2">
          El PIN lo usa para mostrar el QR de respaldo en{" "}
          <Link href={`/mozo/${slug}`} className="font-medium text-pt-ink underline underline-offset-2">/mozo/{slug}</Link>. Los llaveros los da de alta el administrador.
        </p>
      </Tarjeta>

      {!mozos?.length ? (
        <Vacio
          titulo={`Todavía no hay ${t.plural}`}
          accion={
            <a href="#nuevo" className={claseBoton("primario")}>
              Agregar el primero
            </a>
          }
        >
          Cargá a tu equipo para saber quién da cada punto y para que puedan usar el QR de respaldo.
        </Vacio>
      ) : (
        <Tarjeta className="overflow-hidden !p-0">
          <ul className="divide-y divide-pt-border">
            {mozos.map((m) => {
              const suyos = (chips ?? []).filter((c) => c.mozo_id === m.id);
              return (
                <li key={m.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${m.activo ? "" : "opacity-70"}`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pt-surface text-[13px] font-semibold text-pt-ink" aria-hidden>
                    {m.nombre.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-[15px] font-medium text-pt-ink">
                      {m.nombre}
                      {!m.activo && <Insignia>inactivo</Insignia>}
                    </p>
                    <p className="pt-app-detalle text-pt-ink-2">
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
      <p className="mt-3 pt-app-detalle text-pt-ink-2">
        Un {t.singular} desactivado no puede sumar puntos ni con el llavero ni con el QR. Su historial se conserva.
      </p>
    </>
  );
}
