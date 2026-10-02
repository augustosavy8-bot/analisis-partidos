import { requerirLocal } from "@/lib/panel";
import { Tarjeta, Titulo, Vacio } from "@/components/Panel";
import { FormPremio } from "./FormPremio";
import { FilaPremio } from "./FilaPremio";
import { claseBoton } from "@/components/app/Boton";
import { MejorarPlan } from "@/components/app/MejorarPlan";
import { accesoDelLocal } from "@/lib/facturacion/acceso-servidor";
import { dentroDelLimite, puedeUsar } from "@/lib/facturacion/acceso";

export const metadata = { title: "Premios" };

export default async function Premios({ params }: PageProps<"/panel/[local]/premios">) {
  const { local: slug } = await params;
  const { db, local } = await requerirLocal(slug);
  const [{ data: premios }, { data: canjes }] = await Promise.all([
    db.from("premios").select("id, nombre, descripcion, puntos_necesarios, activo").eq("local_id", local.id).order("puntos_necesarios"),
    db.from("canjes").select("premio_id").eq("local_id", local.id).eq("estado", "confirmado"),
  ]);
  const acceso = await accesoDelLocal(local.id);
  const activos = (premios ?? []).filter((p) => p.activo).length;
  const puedeCrear = puedeUsar(acceso, "crear_premio") && dentroDelLimite(acceso, "premios", activos + 1);
  const usos = new Map<string, number>();
  (canjes ?? []).forEach((c) => usos.set(c.premio_id, (usos.get(c.premio_id) ?? 0) + 1));

  return (
    <>
      <Titulo detalle="Lo que tus clientes pueden canjear con sus puntos.">Premios</Titulo>
      {puedeCrear ? (
        <Tarjeta className="mb-4">
          <h2 id="nuevo-premio" className="pt-app-seccion mb-3 text-pt-ink">Nuevo premio</h2>
          <FormPremio slug={slug} />
        </Tarjeta>
      ) : puedeUsar(acceso, "crear_premio") ? (
        <MejorarPlan titulo={`Llegaste a ${acceso.limites?.premios} premios activos`} className="mb-4">
          Tu plan {acceso.planNombre} incluye hasta {acceso.limites?.premios} premios. Con Pro cargás todos los que quieras. También podés ocultar uno para
          cargar otro.
        </MejorarPlan>
      ) : (
        <MejorarPlan titulo="No podés crear premios ahora" className="mb-4">
          Revisá el estado de tu cuenta en Facturación.
        </MejorarPlan>
      )}
      {!premios?.length ? (
        <Vacio
          titulo="Todavía no hay premios"
          accion={
            <a href="#nuevo-premio" className={claseBoton("primario")}>
              Crear el primer premio
            </a>
          }
        >
          Sin premios, los clientes no tienen hacia dónde sumar. Empezá por uno simple, como un café gratis a los 10 puntos.
        </Vacio>
      ) : (
        <Tarjeta className="overflow-hidden !p-0">
          <ul className="divide-y divide-pt-border">
            {premios.map((p) => (
              <FilaPremio key={p.id} slug={slug} premio={{ ...p, canjes: usos.get(p.id) ?? 0 }} />
            ))}
          </ul>
        </Tarjeta>
      )}
      <p className="mt-3 pt-app-detalle text-pt-ink-2">Los premios ocultos no aparecen en la tarjeta del cliente.</p>
    </>
  );
}
