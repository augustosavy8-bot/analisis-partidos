import Link from "next/link";
import { fecha, fechaHora, requerirLocal } from "@/lib/panel";
import { formatearWhatsapp } from "@/lib/whatsapp";
import { Tarjeta, Titulo, Vacio, inputPanel } from "@/components/Panel";
import { BotonEliminar } from "./BotonEliminar";

export const metadata = { title: "Clientes" };

type Fila = {
  cliente_id: string;
  nombre: string;
  whatsapp: string;
  puntos: number;
  visitas: number;
  canjes: number;
  ultima_visita: string | null;
  alta: string;
};

export default async function Clientes({ params, searchParams }: PageProps<"/panel/[local]/clientes">) {
  const { local: slug } = await params;
  const { q } = await searchParams;
  const busqueda = typeof q === "string" ? q.slice(0, 60) : "";
  const { db, local } = await requerirLocal(slug);
  const { data, error } = await db.rpc("panel_clientes", { p_local_id: local.id, p_busqueda: busqueda || null, p_limite: 200 });
  if (error) throw new Error(error.message);
  const filas = (data ?? []) as Fila[];

  return (
    <>
      <Titulo
        accion={
          <a
            href={`/panel/${slug}/clientes/csv${busqueda ? `?q=${encodeURIComponent(busqueda)}` : ""}`}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Exportar CSV
          </a>
        }
      >
        Clientes
      </Titulo>

      <form className="mb-4 flex gap-2" role="search">
        <input
          name="q"
          defaultValue={busqueda}
          placeholder="Buscar por nombre o WhatsApp"
          className={inputPanel}
          type="search"
        />
        <button className="rounded-lg bg-stone-900 px-4 text-sm font-medium text-white">Buscar</button>
      </form>

      {filas.length === 0 ? (
        <Vacio>{busqueda ? "No encontramos clientes con esa búsqueda." : "Todavía no hay clientes. ¡Que empiecen los toques!"}</Vacio>
      ) : (
        <Tarjeta className="!p-0 overflow-hidden">
          {/* Móvil: lista; escritorio: tabla */}
          <ul className="divide-y divide-stone-100 md:hidden">
            {filas.map((c) => (
              <li key={c.cliente_id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.nombre}</p>
                  <p className="text-xs text-stone-500">
                    {formatearWhatsapp(c.whatsapp)} · última visita {fechaHora(c.ultima_visita, local.zona_horaria)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold tabular-nums">{c.puntos}</p>
                  <p className="text-xs text-stone-500">puntos</p>
                </div>
                <BotonEliminar slug={slug} clienteId={c.cliente_id} nombre={c.nombre} />
              </li>
            ))}
          </ul>
          <table className="hidden w-full text-sm md:table">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">WhatsApp</th>
                <th className="px-4 py-3 text-right font-medium">Puntos</th>
                <th className="px-4 py-3 text-right font-medium">Visitas</th>
                <th className="px-4 py-3 text-right font-medium">Canjes</th>
                <th className="px-4 py-3 font-medium">Última visita</th>
                <th className="px-4 py-3 font-medium">Alta</th>
                <th className="px-4 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filas.map((c) => (
                <tr key={c.cliente_id}>
                  <td className="px-4 py-3 font-medium">{c.nombre}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`https://wa.me/${c.whatsapp.replace("+", "")}`}
                      target="_blank"
                      className="text-stone-700 underline decoration-stone-300 underline-offset-2"
                    >
                      {formatearWhatsapp(c.whatsapp)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{c.puntos}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.visitas}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.canjes}</td>
                  <td className="px-4 py-3 text-stone-600">{fechaHora(c.ultima_visita, local.zona_horaria)}</td>
                  <td className="px-4 py-3 text-stone-600">{fecha(c.alta, local.zona_horaria)}</td>
                  <td className="px-4 py-3 text-right">
                    <BotonEliminar slug={slug} clienteId={c.cliente_id} nombre={c.nombre} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Tarjeta>
      )}
      {filas.length === 200 && (
        <p className="mt-3 text-center text-sm text-stone-500">Mostrando los 200 más recientes. Usá la búsqueda o exportá el CSV para ver todos.</p>
      )}
      <p className="mt-3 text-sm text-stone-500">
        Si un cliente te pide que borres sus datos, usá “Eliminar”: se borra su tarjeta de este local y, si no tiene tarjeta en otro local, todos sus datos.
      </p>
    </>
  );
}
