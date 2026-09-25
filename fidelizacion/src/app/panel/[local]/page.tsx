import { requerirLocal } from "@/lib/panel";
import { Tarjeta, Titulo } from "@/components/Panel";
import { GraficoVisitas } from "./GraficoVisitas";
import { formasTermino } from "@/lib/terminos";
import { Icono, type NombreIcono } from "@/components/Icono";

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
  const t = formasTermino(local.termino_personal);

  const pctRecurrentes = m.clientes_activos ? Math.round((m.clientes_recurrentes / m.clientes_activos) * 100) : 0;
  const maxMozo = Math.max(1, ...m.ranking_mozos.map((r) => r.sumas));

  return (
    <>
      <Titulo>Resumen</Titulo>
      <p className="-mt-3 mb-5 text-sm text-stone-500">Últimos 30 días, salvo que diga otra cosa.</p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero icono="cliente" etiqueta="Clientes" valor={m.clientes_total} detalle={`+${m.clientes_nuevos} nuevos`} />
        <Numero icono="sumar-punto" etiqueta="Visitas" valor={m.visitas} detalle={`${m.clientes_activos} clientes distintos`} />
        <Numero
          icono="historial"
          etiqueta="Vuelven"
          valor={`${pctRecurrentes}%`}
          detalle={`${m.clientes_recurrentes} vinieron 2 veces o más`}
        />
        <Numero icono="canjear" etiqueta="Canjes" valor={m.canjes} detalle="premios entregados" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Tarjeta>
          <GraficoVisitas datos={m.visitas_por_dia} />
        </Tarjeta>

        <Tarjeta>
          <h2 className="font-medium">Ranking de {t.plural}</h2>
          <p className="text-sm text-stone-500">Puntos dados en 30 días</p>
          {m.ranking_mozos.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">Todavía no hay {t.plural}.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {m.ranking_mozos.map((r, i) => (
                <li key={r.id}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">
                      <span className="mr-2 text-stone-400">{i + 1}</span>
                      {r.nombre}
                      {!r.activo && <span className="ml-1 text-xs text-stone-400">(inactivo)</span>}
                    </span>
                    <span className="tabular-nums text-stone-600">
                      {r.sumas}
                      {r.canjes > 0 && <span className="text-stone-400"> · {r.canjes} canjes</span>}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(r.sumas / maxMozo) * 100}%`, background: "var(--marca)" }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Tarjeta>
      </div>
    </>
  );
}

function Numero({ icono, etiqueta, valor, detalle }: { icono: NombreIcono; etiqueta: string; valor: number | string; detalle: string }) {
  return (
    <Tarjeta className="!p-4">
      <p className="flex items-center gap-2 text-sm text-stone-500">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: "color-mix(in oklab, var(--marca) 8%, white)", color: "var(--marca)" }}
        >
          <Icono nombre={icono} tamaño={16} />
        </span>
        {etiqueta}
      </p>
      <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{valor}</p>
      <p className="mt-1 text-xs text-stone-500">{detalle}</p>
    </Tarjeta>
  );
}
