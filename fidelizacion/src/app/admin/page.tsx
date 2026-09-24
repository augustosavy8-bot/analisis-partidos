import Link from "next/link";
import { requerirSuperadmin } from "@/lib/admin";
import { fechaHora } from "@/lib/panel";
import { Tarjeta, Titulo, Vacio } from "@/components/Panel";

type Resumen = {
  totales: { locales: number; clientes: number; visitas_hoy: number; canjes_hoy: number; visitas_30d: number; rechazos_24h: number };
  locales: {
    id: string; slug: string; nombre: string; activo: boolean; clientes: number; visitas_30d: number; visitas_hoy: number;
    ultimo_movimiento: string | null; mozos: number; chips_prueba: number; chips_produccion: number; duenos: number;
  }[];
  rechazos_por_motivo: { motivo: string; cantidad: number }[];
  rechazos_recientes: { motivo: string; origen: string | null; created_at: string; local: string | null; chip: string | null }[];
};

const MOTIVOS: Record<string, string> = {
  limite: "Toque antes de tiempo",
  chip_invalido: "Chip desconocido",
  chip_sin_mozo: "Chip sin mozo",
  modo_prueba_off: "Chip de prueba (apagado)",
  qr_usado: "QR reusado",
  qr_vencido: "QR vencido o adulterado",
  qr_invalido: "QR de mozo inactivo",
  local_inactivo: "Local inactivo",
  mozo_invalido: "Mozo inválido",
};
const TZ = "America/Argentina/Buenos_Aires";

export default async function Estado() {
  const { db } = await requerirSuperadmin();
  const { data, error } = await db.rpc("admin_resumen");
  if (error) throw new Error(error.message);
  const r = data as Resumen;

  return (
    <>
      <Titulo
        accion={
          <Link href="/admin/locales/nuevo" className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white">
            + Nuevo local
          </Link>
        }
      >
        Estado general
      </Titulo>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Dato etiqueta="Locales" valor={r.totales.locales} />
        <Dato etiqueta="Clientes" valor={r.totales.clientes} detalle="en todos los locales" />
        <Dato etiqueta="Visitas hoy" valor={r.totales.visitas_hoy} detalle={`${r.totales.visitas_30d} en 30 días · ${r.totales.canjes_hoy} canjes hoy`} />
        <Dato etiqueta="Rechazos 24 h" valor={r.totales.rechazos_24h} detalle="toques no aceptados" />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-widest text-stone-500">Locales</h2>
      {r.locales.length === 0 ? (
        <Vacio>No hay locales todavía.</Vacio>
      ) : (
        <Tarjeta className="!p-0 overflow-hidden">
          <ul className="divide-y divide-stone-100">
            {r.locales.map((l) => (
              <li key={l.id}>
                <Link href={`/admin/locales/${l.slug}`} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3 hover:bg-stone-50">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {l.nombre}
                      {!l.activo && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">inactivo</span>}
                    </p>
                    <p className="text-xs text-stone-500">
                      /{l.slug} · {l.duenos} {l.duenos === 1 ? "dueño" : "dueños"} · {l.mozos} mozos ·{" "}
                      {l.chips_produccion} chips{l.chips_prueba > 0 && ` + ${l.chips_prueba} de prueba`}
                    </p>
                  </div>
                  <div className="flex gap-6 text-sm tabular-nums">
                    <Mini etiqueta="clientes" valor={l.clientes} />
                    <Mini etiqueta="hoy" valor={l.visitas_hoy} />
                    <Mini etiqueta="30 días" valor={l.visitas_30d} />
                    <div className="hidden w-28 text-right text-xs text-stone-500 sm:block">
                      Último: {fechaHora(l.ultimo_movimiento, TZ)}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-widest text-stone-500">Toques rechazados</h2>
      <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
        <Tarjeta>
          <p className="font-medium">Últimos 7 días</p>
          {r.rechazos_por_motivo.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">Ninguno. 👌</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {r.rechazos_por_motivo.map((m) => (
                <li key={m.motivo} className="flex justify-between gap-3">
                  <span>{MOTIVOS[m.motivo] ?? m.motivo}</span>
                  <span className="font-semibold tabular-nums">{m.cantidad}</span>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
        <Tarjeta className="!p-0 overflow-hidden">
          {r.rechazos_recientes.length === 0 ? (
            <p className="p-5 text-sm text-stone-500">Sin rechazos recientes.</p>
          ) : (
            <ul className="divide-y divide-stone-100 text-sm">
              {r.rechazos_recientes.map((x, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2 px-4 py-2.5">
                  <span>
                    <span className="font-medium">{MOTIVOS[x.motivo] ?? x.motivo}</span>
                    <span className="text-stone-500">
                      {x.local && ` · ${x.local}`}
                      {x.chip && ` · ${x.chip}`}
                      {x.origen && ` · ${x.origen === "qr" ? "QR" : "NFC"}`}
                    </span>
                  </span>
                  <span className="text-stone-500">{fechaHora(x.created_at, TZ)}</span>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>
      <p className="mt-2 text-xs text-stone-500">
        “Toque antes de tiempo” es normal (el cliente tocó de nuevo en la misma visita). Muchos “chip desconocido” o “QR reusado” seguidos pueden ser un intento de fraude.
      </p>
    </>
  );
}

function Dato({ etiqueta, valor, detalle }: { etiqueta: string; valor: number; detalle?: string }) {
  return (
    <Tarjeta className="!p-4">
      <p className="text-sm text-stone-500">{etiqueta}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{valor}</p>
      {detalle && <p className="mt-1 text-xs text-stone-500">{detalle}</p>}
    </Tarjeta>
  );
}

function Mini({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="text-right">
      <p className="font-semibold">{valor}</p>
      <p className="text-xs text-stone-500">{etiqueta}</p>
    </div>
  );
}
