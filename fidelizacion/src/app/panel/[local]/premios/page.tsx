import { requerirLocal } from "@/lib/panel";
import { Tarjeta, Titulo, Vacio } from "@/components/Panel";
import { FormPremio } from "./FormPremio";
import { FilaPremio } from "./FilaPremio";

export const metadata = { title: "Premios" };

export default async function Premios({ params }: PageProps<"/panel/[local]/premios">) {
  const { local: slug } = await params;
  const { db, local } = await requerirLocal(slug);
  const [{ data: premios }, { data: canjes }] = await Promise.all([
    db.from("premios").select("id, nombre, descripcion, puntos_necesarios, activo").eq("local_id", local.id).order("puntos_necesarios"),
    db.from("canjes").select("premio_id").eq("local_id", local.id).eq("estado", "confirmado"),
  ]);
  const usos = new Map<string, number>();
  (canjes ?? []).forEach((c) => usos.set(c.premio_id, (usos.get(c.premio_id) ?? 0) + 1));

  return (
    <>
      <Titulo>Premios</Titulo>
      <Tarjeta className="mb-4">
        <h2 className="mb-3 font-medium">Nuevo premio</h2>
        <FormPremio slug={slug} />
      </Tarjeta>
      {!premios?.length ? (
        <Vacio>Todavía no hay premios. Sin premios, los clientes no tienen hacia dónde sumar.</Vacio>
      ) : (
        <Tarjeta className="!p-0 overflow-hidden">
          <ul className="divide-y divide-stone-100">
            {premios.map((p) => (
              <FilaPremio key={p.id} slug={slug} premio={{ ...p, canjes: usos.get(p.id) ?? 0 }} />
            ))}
          </ul>
        </Tarjeta>
      )}
      <p className="mt-3 text-sm text-stone-500">Los premios ocultos no aparecen en la tarjeta del cliente.</p>
    </>
  );
}
