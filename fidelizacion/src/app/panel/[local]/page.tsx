import { requerirLocal } from "@/lib/panel";
import Link from "next/link";
import { Tarjeta, Titulo, Vacio } from "@/components/Panel";
import { BotonLink } from "@/components/app/Boton";
import { GraficoVisitas } from "./GraficoVisitas";
import { AvisosHoy } from "./AvisosHoy";
import { formasTermino } from "@/lib/terminos";
import { Icono, type NombreIcono } from "@/components/Icono";
import { MejorarPlan } from "@/components/app/MejorarPlan";
import { accesoDelLocal } from "@/lib/facturacion/acceso-servidor";
import { dentroDelLimite, puedeUsar } from "@/lib/facturacion/acceso";

type Metricas = {
  clientes_total: number;
  clientes_nuevos: number;
  visitas: number;
  clientes_activos: number;
  clientes_recurrentes: number;
  canjes: number;
  visitas_por_dia: { dia: string; visitas: number }[];
  ranking_mozos: { id: string; nombre: string; activo: boolean; sumas: number; canjes: number }[];
};

export const metadata = { title: "Resumen" };

export default async function Resumen({ params }: PageProps<"/panel/[local]">) {
  const { local: slug } = await params;
  const { db, local } = await requerirLocal(slug);
  const { data, error } = await db.rpc("panel_metricas", { p_local_id: local.id, p_dias: 30 });
  if (error) throw new Error(error.message);
  const m = data as Metricas;
  const acceso = await accesoDelLocal(local.id);
  const basicas = puedeUsar(acceso, "estadisticas");
  const avanzadas = puedeUsar(acceso, "estadisticas_avanzadas");
  const t = formasTermino(local.termino_personal);

  const pctRecurrentes = m.clientes_activos ? Math.round((m.clientes_recurrentes / m.clientes_activos) * 100) : 0;
  const maxMozo = Math.max(1, ...m.ranking_mozos.map((r) => r.sumas));

  return (
    <>
      <Titulo detalle="Últimos 30 días, salvo que diga otra cosa.">Resumen</Titulo>

      {m.clientes_total > 0 && <AvisosHoy db={db} localId={local.id} slug={slug} />}

      {m.clientes_total === 0 && (
        <div className="mb-4">
          <Vacio
            titulo="Todavía no hay clientes"
            accion={
              <BotonLink href={`/panel/${slug}/premios`} variante="primario">
                Cargar premios
              </BotonLink>
            }
          >
            Cuando tu equipo apoye el llavero en el celular de un cliente, acá vas a ver visitas, clientes que vuelven y canjes. Antes, cargá los premios para que tengan hacia dónde sumar.
          </Vacio>
        </div>
      )}

      {acceso.limites && !dentroDelLimite(acceso, "clientes", m.clientes_total) && (
        <MejorarPlan titulo="Superaste los clientes de tu plan" className="mb-4">
          Tenés {m.clientes_total} clientes con tarjeta y tu plan {acceso.planNombre} incluye {acceso.limites.clientes}. Tus clientes siguen sumando
          igual; pasá a un plan con más clientes.
        </MejorarPlan>
      )}

      {!basicas ? (
        <MejorarPlan titulo="Las estadísticas no están disponibles" boton="Ver facturación">
          Mientras tu cuenta esté restringida no se ven las estadísticas ni se puede editar el programa. Tus clientes siguen pudiendo canjear sus
          puntos.
        </MejorarPlan>
      ) : (
        <>
          <div className={`grid grid-cols-2 gap-3 ${avanzadas ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            <Numero icono="cliente" etiqueta="Clientes" valor={m.clientes_total} detalle={`+${m.clientes_nuevos} nuevos`} />
            <Numero icono="sumar-punto" etiqueta="Visitas" valor={m.visitas} detalle={`${m.clientes_activos} clientes distintos`} />
            {avanzadas && (
              <Numero
                icono="historial"
                etiqueta="Vuelven"
                valor={`${pctRecurrentes}%`}
                detalle={`${m.clientes_recurrentes} vinieron 2 veces o más`}
              />
            )}
            <Numero icono="canjear" etiqueta="Canjes" valor={m.canjes} detalle="premios entregados" />
          </div>

          {!avanzadas ? (
            <MejorarPlan titulo="Estadísticas avanzadas son del plan Pro" className="mt-4">
              Con Pro ves cuántos clientes vuelven, las visitas día por día y el ranking de tu equipo.
            </MejorarPlan>
          ) : (
            <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
              <Tarjeta>
                <GraficoVisitas datos={m.visitas_por_dia} />
              </Tarjeta>

              <Tarjeta>
                <h2 className="pt-app-seccion text-pt-ink">Ranking de {t.plural}</h2>
                <p className="pt-app-detalle text-pt-ink-2">Puntos dados en 30 días</p>
                {m.ranking_mozos.length === 0 ? (
                  <div className="mt-4 rounded-pt-sm bg-pt-surface p-4 text-center pt-app-detalle text-pt-ink-2">
                    Todavía no hay {t.plural}.{" "}
                    <Link href={`/panel/${slug}/mozos`} className="font-semibold text-pt-ink underline underline-offset-2">
                      Agregar
                    </Link>
                  </div>
                ) : (
                  <ol className="mt-4 space-y-3">
                    {m.ranking_mozos.map((r, i) => (
                      <li key={r.id}>
                        <div className="flex items-baseline justify-between pt-app-detalle">
                          <span className="font-medium text-pt-ink">
                            <span className="mr-2 text-pt-ink-2 tabular-nums">{i + 1}</span>
                            {r.nombre}
                            {!r.activo && <span className="ml-1 text-pt-ink-2">(inactivo)</span>}
                          </span>
                          <span className="tabular-nums text-pt-ink">
                            {r.sumas}
                            {r.canjes > 0 && <span className="text-pt-ink-2"> · {r.canjes} canjes</span>}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-pt-surface">
                          <div className="h-full rounded-full bg-pt-accent" style={{ width: `${(r.sumas / maxMozo) * 100}%` }} />
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </Tarjeta>
            </div>
          )}
        </>
      )}
    </>
  );
}

function Numero({ icono, etiqueta, valor, detalle }: { icono: NombreIcono; etiqueta: string; valor: number | string; detalle: string }) {
  return (
    <Tarjeta className="!p-4">
      <p className="flex items-center gap-2 pt-app-detalle font-medium text-pt-ink-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pt-accent-soft text-pt-accent-ink">
          <Icono nombre={icono} tamaño={16} />
        </span>
        {etiqueta}
      </p>
      <p className="pt-app-numero mt-2 text-pt-ink">{valor}</p>
      <p className="mt-1 pt-app-detalle text-pt-ink-2">{detalle}</p>
    </Tarjeta>
  );
}
