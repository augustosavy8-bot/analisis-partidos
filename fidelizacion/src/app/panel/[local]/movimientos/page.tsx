import Link from "next/link";
import { fechaHora, requerirLocal } from "@/lib/panel";
import { Tarjeta, Titulo, Vacio } from "@/components/Panel";
import { formasTermino } from "@/lib/terminos";
import { nombreIconoMovimiento, textoMovimientoPanel, type MotivoMovimiento, type TipoMovimiento } from "@/lib/movimientos";
import { IconoFila } from "@/components/app/Superficie";
import { BotonLink, claseChip } from "@/components/app/Boton";

export const metadata = { title: "Movimientos" };

type Mov = {
  id: string;
  tipo: TipoMovimiento;
  puntos: number;
  motivo: MotivoMovimiento;
  detalle: string | null;
  origen: "nfc" | "qr";
  created_at: string;
  mozo_id: string;
  mozos: { nombre: string } | null;
  tarjetas: { clientes: { nombre: string } | null } | null;
  canjes: { premios: { nombre: string } | null } | null;
};

export default async function Movimientos({ params, searchParams }: PageProps<"/panel/[local]/movimientos">) {
  const { local: slug } = await params;
  const sp = await searchParams;
  const tipo = sp.tipo === "suma" || sp.tipo === "canje" || sp.tipo === "regalo" ? sp.tipo : null;
  const mozo = typeof sp.mozo === "string" && /^[0-9a-f-]{36}$/.test(sp.mozo) ? sp.mozo : null;
  const { db, local } = await requerirLocal(slug);

  let consulta = db
    .from("movimientos")
    .select("id, tipo, puntos, motivo, detalle, origen, created_at, mozo_id, mozos(nombre), tarjetas(clientes(nombre)), canjes(premios(nombre))")
    .eq("local_id", local.id)
    .order("created_at", { ascending: false })
    .limit(150);
  if (tipo) consulta = consulta.eq("tipo", tipo);
  if (mozo) consulta = consulta.eq("mozo_id", mozo);

  const [{ data, error }, { data: mozos }] = await Promise.all([
    consulta,
    db.from("mozos").select("id, nombre").eq("local_id", local.id).order("nombre"),
  ]);
  if (error) throw new Error(error.message);
  const movs = (data ?? []) as unknown as Mov[];

  const filtro = (extra: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const v = { tipo, mozo, ...extra };
    Object.entries(v).forEach(([k, val]) => val && p.set(k, val));
    const s = p.toString();
    return `/panel/${slug}/movimientos${s ? `?${s}` : ""}`;
  };
  const chip = claseChip;
  const hayFiltros = !!(tipo || mozo);

  return (
    <>
      <Titulo>Movimientos</Titulo>
      <div className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none]">
        <Link href={filtro({ tipo: null })} className={chip(!tipo)}>Todos</Link>
        <Link href={filtro({ tipo: "suma" })} className={chip(tipo === "suma")}>Puntos</Link>
        <Link href={filtro({ tipo: "regalo" })} className={chip(tipo === "regalo")}>Regalos</Link>
        <Link href={filtro({ tipo: "canje" })} className={chip(tipo === "canje")}>Canjes</Link>
      </div>
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none]">
        <Link href={filtro({ mozo: null })} className={chip(!mozo)}>Todos los {formasTermino(local.termino_personal).plural}</Link>
        {(mozos ?? []).map((m) => (
          <Link key={m.id} href={filtro({ mozo: m.id })} className={chip(mozo === m.id)}>
            {m.nombre}
          </Link>
        ))}
      </div>

      {movs.length === 0 ? (
        hayFiltros ? (
          <Vacio
            titulo="Sin movimientos con estos filtros"
            ilustracion={false}
            accion={
              <BotonLink href={`/panel/${slug}/movimientos`} variante="secundario">
                Ver todos
              </BotonLink>
            }
          />
        ) : (
          <Vacio
            titulo="Todavía no hay movimientos"
            accion={
              <BotonLink href={`/panel/${slug}/mozos`} variante="primario">
                Preparar a tu equipo
              </BotonLink>
            }
          >
            Cada punto, regalo y canje queda registrado acá, con quién lo dio y a qué hora.
          </Vacio>
        )
      ) : (
        <Tarjeta className="overflow-hidden !p-0">
          <ul className="divide-y divide-pt-border">
            {movs.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <IconoFila icono={nombreIconoMovimiento(m)} tono={m.tipo !== "canje" ? "acento" : "oscuro"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-pt-ink">
                    {m.tarjetas?.clientes?.nombre ?? "Cliente"}{" "}
                    <span className="font-normal text-pt-ink-2">
                      {textoMovimientoPanel(m, m.canjes?.premios?.nombre)}
                    </span>
                  </p>
                  <p className="pt-app-detalle text-pt-ink-2">
                    {fechaHora(m.created_at, local.zona_horaria)} · {m.mozos?.nombre ?? "—"} ·{" "}
                    {m.origen === "nfc" ? "Llavero" : "QR"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
      {movs.length === 150 && <p className="mt-3 text-center pt-app-detalle text-pt-ink-2">Mostrando los últimos 150.</p>}
    </>
  );
}
