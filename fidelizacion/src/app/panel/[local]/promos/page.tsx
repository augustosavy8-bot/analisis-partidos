import { requerirLocal } from "@/lib/panel";
import { Tarjeta, Titulo, Vacio } from "@/components/Panel";
import { promoVigente, type Promo } from "@/lib/promos";
import { FilaPromo, FormPromo, FormRegalos } from "./Formularios";

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

  return (
    <>
      <Titulo>Promos y regalos</Titulo>

      <Tarjeta className="mb-4">
        <h2 className="font-medium">Regalos</h2>
        <p className="mb-4 mt-1 text-sm text-stone-500">Puntos extra que se suman solos, sin que tu equipo haga nada distinto.</p>
        <FormRegalos slug={slug} bienvenida={local.puntos_bienvenida} cumple={local.puntos_cumple} />
      </Tarjeta>

      <Tarjeta className="mb-4">
        <h2 className="font-medium">Nueva promo de puntos</h2>
        <p className="mb-4 mt-1 text-sm text-stone-500">
          Sirve para llenar los días u horarios flojos. Los clientes la ven en su tarjeta y el toque suma más puntos
          automáticamente.
        </p>
        <FormPromo slug={slug} />
      </Tarjeta>

      {ahora && (
        <p className="mb-3 rounded-xl px-4 py-3 text-sm font-medium" style={{ background: "var(--marca-acento)", color: "var(--marca)" }}>
          🔥 Ahora está activa: {ahora.nombre}
        </p>
      )}
      {promos.length === 0 ? (
        <Vacio>Todavía no hay promos.</Vacio>
      ) : (
        <Tarjeta className="!p-0 overflow-hidden">
          <ul className="divide-y divide-stone-100">
            {promos.map((p) => (
              <FilaPromo key={p.id} slug={slug} promo={p} />
            ))}
          </ul>
        </Tarjeta>
      )}
      <p className="mt-3 text-sm text-stone-500">
        Horarios en hora de {local.zona_horaria.split("/").pop()?.replace(/_/g, " ")}. La regla de tiempo entre puntos
        sigue valiendo durante la promo.
      </p>
    </>
  );
}
