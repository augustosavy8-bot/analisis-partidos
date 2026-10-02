import { requerirLocal } from "@/lib/panel";
import { Tarjeta, Titulo, Vacio } from "@/components/Panel";
import { promoVigente, type Promo } from "@/lib/promos";
import { FilaPromo, FormPromo, FormRegalos } from "./Formularios";
import { claseBoton } from "@/components/app/Boton";
import { Aviso } from "@/components/app/Superficie";
import { MejorarPlan } from "@/components/app/MejorarPlan";
import { accesoDelLocal } from "@/lib/facturacion/acceso-servidor";
import { puedeUsar } from "@/lib/facturacion/acceso";

export const metadata = { title: "Promos" };

export default async function Promos({ params }: PageProps<"/panel/[local]/promos">) {
  const { local: slug } = await params;
  const { db, local } = await requerirLocal(slug);
  const { data } = await db
    .from("promos")
    .select("id, nombre, dias, desde, hasta, puntos, activa")
    .eq("local_id", local.id)
    .order("created_at");
  const promos = (data ?? []) as Promo[];
  const ahora = promoVigente(promos, local.zona_horaria);

  if (!puedeUsar(await accesoDelLocal(local.id), "promos")) {
    return (
      <>
        <Titulo detalle="Puntos extra para traer gente en los días flojos.">Promos y regalos</Titulo>
        <MejorarPlan titulo="Promos y regalos son del plan Pro">
          Puntos dobles o triples en los horarios flojos, regalo de bienvenida y puntos de cumpleaños, que se suman solos.
        </MejorarPlan>
        {/* Lo que quedó prendido de antes (otro plan o cortesía): se puede ver y apagar. */}
        {(local.puntos_bienvenida > 0 || local.puntos_cumple > 0) && (
          <Tarjeta className="mt-4">
            <h2 className="pt-app-seccion text-pt-ink">Regalos que siguen activos</h2>
            <p className="mb-4 mt-1 pt-app-detalle text-pt-ink-2">Para apagarlos, poné 0 y guardá.</p>
            <FormRegalos slug={slug} bienvenida={local.puntos_bienvenida} cumple={local.puntos_cumple} />
          </Tarjeta>
        )}
        {promos.some((p) => p.activa) && (
          <Tarjeta className="mt-4 overflow-hidden !p-0">
            <ul className="divide-y divide-pt-border">
              {promos.filter((p) => p.activa).map((p) => (
                <FilaPromo key={p.id} slug={slug} promo={p} />
              ))}
            </ul>
          </Tarjeta>
        )}
      </>
    );
  }

  return (
    <>
      <Titulo detalle="Puntos extra para traer gente en los días flojos.">Promos y regalos</Titulo>

      <Tarjeta className="mb-4">
        <h2 className="pt-app-seccion text-pt-ink">Regalos</h2>
        <p className="mb-4 mt-1 pt-app-detalle text-pt-ink-2">Puntos extra que se suman solos, sin que tu equipo haga nada distinto.</p>
        <FormRegalos slug={slug} bienvenida={local.puntos_bienvenida} cumple={local.puntos_cumple} />
      </Tarjeta>

      <Tarjeta className="mb-4">
        <h2 id="nueva-promo" className="pt-app-seccion text-pt-ink">Nueva promo de puntos</h2>
        <p className="mb-4 mt-1 pt-app-detalle text-pt-ink-2">
          Sirve para llenar los días u horarios flojos. Los clientes la ven en su tarjeta y el toque suma más puntos
          automáticamente.
        </p>
        <FormPromo slug={slug} />
      </Tarjeta>

      {ahora && (
        <Aviso tono="acento" icono="sumar-punto" className="mb-3 font-medium">
          Ahora está activa: {ahora.nombre}
        </Aviso>
      )}
      {promos.length === 0 ? (
        <Vacio
          titulo="Todavía no hay promos"
          ilustracion={false}
          accion={
            <a href="#nueva-promo" className={claseBoton("primario")}>
              Crear una promo
            </a>
          }
        >
          Por ejemplo: puntos dobles los martes de 15 a 18.
        </Vacio>
      ) : (
        <Tarjeta className="overflow-hidden !p-0">
          <ul className="divide-y divide-pt-border">
            {promos.map((p) => (
              <FilaPromo key={p.id} slug={slug} promo={p} />
            ))}
          </ul>
        </Tarjeta>
      )}
      <p className="mt-3 pt-app-detalle text-pt-ink-2">
        Horarios en hora de {local.zona_horaria.split("/").pop()?.replace(/_/g, " ")}. La regla de tiempo entre puntos
        sigue valiendo durante la promo.
      </p>
    </>
  );
}
