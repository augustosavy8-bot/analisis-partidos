import Link from "next/link";
import type { requerirLocal } from "@/lib/panel";
import { Tarjeta } from "@/components/Panel";
import { Mascota, type EstadoMascota } from "@/components/app/Mascota";
import { SEGMENTOS, type Segmento } from "@/lib/reactivar";

type Fila = { nombre: string | null; no_contactar: boolean };

const DIAS_INACTIVOS = SEGMENTOS.inactivos.porDefecto;

/** Lo que la mascota le cuenta al dueño hoy: cumpleaños, premios sin usar, a quién le falta poco y quién no viene. */
export async function AvisosHoy({ db, localId, slug }: { db: Awaited<ReturnType<typeof requerirLocal>>["db"]; localId: string; slug: string }) {
  const pedir = async (segmento: Segmento, valor: number) => {
    const { data, error } = await db.rpc("panel_reactivar", { p_local_id: localId, p_segmento: segmento, p_valor: valor });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Fila[]).filter((f) => !f.no_contactar);
  };
  const [cumple, premio, cerca, inactivos] = await Promise.all([
    pedir("cumple", 0),
    pedir("premio", 0),
    pedir("cerca", 1),
    pedir("inactivos", DIAS_INACTIVOS),
  ]);

  const avisos: { segmento: Segmento; valor?: number; texto: string }[] = [];
  if (cumple.length) avisos.push({ segmento: "cumple", valor: 0, texto: textoCumple(cumple) });
  if (premio.length) avisos.push({ segmento: "premio", texto: `${cuantos(premio.length)} ${premio.length === 1 ? "tiene" : "tienen"} un premio sin canjear` });
  if (cerca.length) avisos.push({ segmento: "cerca", valor: 1, texto: `A ${cuantos(cerca.length)} ${cerca.length === 1 ? "le" : "les"} falta 1 punto para un premio` });
  if (inactivos.length)
    avisos.push({
      segmento: "inactivos",
      valor: DIAS_INACTIVOS,
      texto: `${cuantos(inactivos.length)} no ${inactivos.length === 1 ? "viene" : "vienen"} hace ${DIAS_INACTIVOS} días o más`,
    });

  const estado: EstadoMascota = cumple.length ? "cumple" : premio.length || cerca.length ? "premio" : inactivos.length ? "extranamos" : "tranqui";
  const titulo = avisos.length ? "Novedades de hoy" : "Todo tranqui por hoy";

  return (
    <Tarjeta className="mb-4 !p-4">
      <div className="flex items-start gap-3">
        <Mascota estado={estado} tamaño={72} className="-my-1" />
        <div className="min-w-0 flex-1">
          <h2 className="pt-app-seccion text-pt-ink">{titulo}</h2>
          {avisos.length === 0 ? (
            <p className="mt-0.5 pt-app-detalle text-pt-ink-2">No hay cumpleaños, premios pendientes ni clientes perdidos. Te aviso cuando haya algo.</p>
          ) : (
            <ul className="mt-1.5 space-y-1.5">
              {avisos.map((a) => (
                <li key={a.segmento}>
                  <Link
                    href={`/panel/${slug}/whatsapp?s=${a.segmento}${a.valor != null ? `&v=${a.valor}` : ""}`}
                    className="flex items-center justify-between gap-2 rounded-pt-sm bg-pt-surface px-3 py-2 pt-app-detalle text-pt-ink hover:bg-pt-border/40"
                  >
                    <span className="min-w-0">{a.texto}</span>
                    <span className="shrink-0 font-semibold text-pt-accent-ink">Escribirles →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Tarjeta>
  );
}

/** La lista viene cortada en 300 (límite de panel_reactivar). */
function cuantos(n: number): string {
  return n === 1 ? "1 cliente" : n >= 300 ? "Más de 300 clientes" : `${n} clientes`;
}

function textoCumple(filas: Fila[]): string {
  const nombres = filas.map((f) => (f.nombre ?? "").trim().split(/\s+/)[0]).filter(Boolean);
  if (nombres.length === 0) return `Hoy ${filas.length === 1 ? "cumple 1 cliente" : `cumplen ${filas.length} clientes`} 🎂`;
  if (nombres.length === 1) return `Hoy cumple años ${nombres[0]} 🎂`;
  if (nombres.length <= 3) return `Hoy cumplen años ${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)} 🎂`;
  return `Hoy cumplen años ${nombres.slice(0, 2).join(", ")} y ${nombres.length - 2} más 🎂`;
}
