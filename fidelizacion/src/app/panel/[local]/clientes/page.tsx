import Link from "next/link";
import { fecha, fechaHora, requerirLocal } from "@/lib/panel";
import { formatearWhatsapp } from "@/lib/whatsapp";
import { Tarjeta, Titulo, Vacio, inputPanel } from "@/components/Panel";
import { BotonLink, claseBoton } from "@/components/app/Boton";
import { Icono } from "@/components/Icono";
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
        detalle={filas.length > 0 ? `${filas.length === 200 ? "200+" : filas.length} ${filas.length === 1 ? "cliente" : "clientes"}` : undefined}
        accion={
          <BotonLink href={`/panel/${slug}/clientes/csv${busqueda ? `?q=${encodeURIComponent(busqueda)}` : ""}`} variante="secundario" tamaño="sm" descargar="clientes.csv">
            <Icono nombre="descargar" tamaño={16} /> CSV
          </BotonLink>
        }
      >
        Clientes
      </Titulo>

      <form className="mb-4 flex gap-2" role="search">
        <label className="relative flex-1">
          <span className="sr-only">Buscar clientes</span>
          <Icono nombre="buscar" tamaño={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pt-ink-2" />
          <input name="q" defaultValue={busqueda} placeholder="Buscar por nombre o WhatsApp" className={`${inputPanel} pl-10`} type="search" />
        </label>
        <button className={claseBoton("primario", "sm")}>Buscar</button>
      </form>

      {filas.length === 0 ? (
        busqueda ? (
          <Vacio
            titulo="Sin resultados"
            ilustracion={false}
            accion={
              <BotonLink href={`/panel/${slug}/clientes`} variante="secundario">
                Limpiar búsqueda
              </BotonLink>
            }
          >
            No encontramos clientes con “{busqueda}”.
          </Vacio>
        ) : (
          <Vacio
            titulo="Todavía no hay clientes"
            accion={
              <BotonLink href={`/panel/${slug}/mozos`} variante="primario">
                Preparar a tu equipo
              </BotonLink>
            }
          >
            Cada cliente aparece acá cuando tu equipo le apoya el llavero por primera vez. ¡Que empiecen los toques!
          </Vacio>
        )
      ) : (
        <Tarjeta className="overflow-hidden !p-0">
          {/* Móvil: lista; escritorio: tabla */}
          <ul className="divide-y divide-pt-border md:hidden">
            {filas.map((c) => (
              <li key={c.cliente_id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pt-surface text-[13px] font-semibold text-pt-ink" aria-hidden>
                  {c.nombre.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-pt-ink">{c.nombre}</p>
                  <p className="truncate pt-app-detalle text-pt-ink-2">
                    {formatearWhatsapp(c.whatsapp)} · {fechaHora(c.ultima_visita, local.zona_horaria)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-[family-name:var(--font-pt-display)] text-lg font-semibold tabular-nums text-pt-ink">{c.puntos}</p>
                  <p className="text-[11px] text-pt-ink-2">puntos</p>
                </div>
                <BotonEliminar slug={slug} clienteId={c.cliente_id} nombre={c.nombre} />
              </li>
            ))}
          </ul>
          <table className="hidden w-full pt-app-detalle md:table">
            <thead className="border-b border-pt-border bg-pt-bg text-left">
              <tr className="pt-label uppercase text-pt-ink-2">
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">WhatsApp</th>
                <th className="px-4 py-3 text-right font-semibold">Puntos</th>
                <th className="px-4 py-3 text-right font-semibold">Visitas</th>
                <th className="px-4 py-3 text-right font-semibold">Canjes</th>
                <th className="px-4 py-3 font-semibold">Última visita</th>
                <th className="px-4 py-3 font-semibold">Alta</th>
                <th className="px-4 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pt-border">
              {filas.map((c) => (
                <tr key={c.cliente_id} className="transition-colors duration-150 hover:bg-pt-bg">
                  <td className="px-4 py-3 text-[14px] font-medium text-pt-ink">{c.nombre}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`https://wa.me/${c.whatsapp.replace("+", "")}`}
                      target="_blank"
                      className="text-pt-ink underline decoration-pt-border underline-offset-2 hover:decoration-pt-ink"
                    >
                      {formatearWhatsapp(c.whatsapp)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-pt-ink">{c.puntos}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-pt-ink">{c.visitas}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-pt-ink">{c.canjes}</td>
                  <td className="px-4 py-3 text-pt-ink-2">{fechaHora(c.ultima_visita, local.zona_horaria)}</td>
                  <td className="px-4 py-3 text-pt-ink-2">{fecha(c.alta, local.zona_horaria)}</td>
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
        <p className="mt-3 text-center pt-app-detalle text-pt-ink-2">Mostrando los 200 más recientes. Usá la búsqueda o exportá el CSV para ver todos.</p>
      )}
      <p className="mt-3 pt-app-detalle text-pt-ink-2">
        Si un cliente te pide que borres sus datos, usá “Eliminar”: se borra su tarjeta de este local y, si no tiene tarjeta en otro local, todos sus datos.
      </p>
    </>
  );
}
