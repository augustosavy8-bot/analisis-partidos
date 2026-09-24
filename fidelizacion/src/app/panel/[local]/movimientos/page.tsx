import Link from "next/link";
import { fechaHora, requerirLocal } from "@/lib/panel";
import { Tarjeta, Titulo, Vacio } from "@/components/Panel";
import { formasTermino } from "@/lib/terminos";

export const metadata = { title: "Movimientos" };

type Mov = {
  id: string;
  tipo: "suma" | "canje";
  puntos: number;
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
  const tipo = sp.tipo === "suma" || sp.tipo === "canje" ? sp.tipo : null;
  const mozo = typeof sp.mozo === "string" && /^[0-9a-f-]{36}$/.test(sp.mozo) ? sp.mozo : null;
  const { db, local } = await requerirLocal(slug);

  let consulta = db
    .from("movimientos")
    .select("id, tipo, puntos, origen, created_at, mozo_id, mozos(nombre), tarjetas(clientes(nombre)), canjes(premios(nombre))")
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
  const chip = (activo: boolean) =>
    `rounded-full px-3 py-1.5 text-sm ${activo ? "bg-stone-900 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200"}`;

  return (
    <>
      <Titulo>Movimientos</Titulo>
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href={filtro({ tipo: null })} className={chip(!tipo)}>Todos</Link>
        <Link href={filtro({ tipo: "suma" })} className={chip(tipo === "suma")}>Puntos</Link>
        <Link href={filtro({ tipo: "canje" })} className={chip(tipo === "canje")}>Canjes</Link>
        <span className="mx-1 w-px bg-stone-200" />
        <Link href={filtro({ mozo: null })} className={chip(!mozo)}>Todos los {formasTermino(local.termino_personal).plural}</Link>
        {(mozos ?? []).map((m) => (
          <Link key={m.id} href={filtro({ mozo: m.id })} className={chip(mozo === m.id)}>
            {m.nombre}
          </Link>
        ))}
      </div>

      {movs.length === 0 ? (
        <Vacio>No hay movimientos con estos filtros.</Vacio>
      ) : (
        <Tarjeta className="!p-0 overflow-hidden">
          <ul className="divide-y divide-stone-100">
            {movs.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                  style={
                    m.tipo === "suma"
                      ? { background: "var(--marca-acento)", color: "var(--marca)" }
                      : { background: "var(--marca)", color: "var(--marca-texto)" }
                  }
                  aria-hidden
                >
                  {m.tipo === "suma" ? "+1" : "🎁"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.tarjetas?.clientes?.nombre ?? "Cliente"}{" "}
                    <span className="font-normal text-stone-500">
                      {m.tipo === "suma" ? "sumó 1 punto" : `canjeó ${m.canjes?.premios?.nombre ?? "un premio"} (${-m.puntos} pts)`}
                    </span>
                  </p>
                  <p className="text-xs text-stone-500">
                    {fechaHora(m.created_at, local.zona_horaria)} · {m.mozos?.nombre ?? "—"} ·{" "}
                    {m.origen === "nfc" ? "Llavero" : "QR"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
      {movs.length === 150 && <p className="mt-3 text-center text-sm text-stone-500">Mostrando los últimos 150.</p>}
    </>
  );
}
