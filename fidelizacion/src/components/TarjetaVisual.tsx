import type { Local } from "@/lib/locales";
import type { Premio } from "@/lib/tarjeta";
import { LogoLocal } from "@/components/CabeceraLocal";

/** La tarjeta de puntos con la marca del local (sellos o barra de progreso). */
export function TarjetaVisual({ local, puntos, objetivo }: { local: Local; puntos: number; objetivo: Premio | null }) {
  const meta = objetivo?.puntos_necesarios ?? 0;
  const usarSellos = meta > 0 && meta <= 12;
  const progreso = meta ? Math.min(1, puntos / meta) : 0;
  const faltan = Math.max(0, meta - puntos);

  return (
    <section
      className="relative mt-4 overflow-hidden rounded-[28px] p-6 shadow-xl"
      style={{ background: "var(--marca)", color: "var(--marca-texto)" }}
    >
      {/* brillo sutil */}
      <div
        className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full opacity-20 blur-2xl"
        style={{ background: "var(--marca-acento)" }}
      />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoLocal local={local} tamaño={40} />
          <p className="font-semibold">{local.nombre}</p>
        </div>
        <p className="text-xs uppercase tracking-widest opacity-70">Tarjeta de puntos</p>
      </div>

      <div className="relative mt-8 flex items-end gap-2">
        <span className="text-6xl font-semibold leading-none tracking-tight">{puntos}</span>
        <span className="mb-1 text-lg opacity-80">{puntos === 1 ? "punto" : "puntos"}</span>
      </div>

      {objetivo && (
        <div className="relative mt-6">
          {usarSellos ? (
            <div
              className="mx-auto grid max-w-xs gap-2.5"
              style={{ gridTemplateColumns: `repeat(${meta <= 6 ? meta : Math.ceil(meta / 2)}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: meta }, (_, i) => {
                const lleno = i < puntos;
                return (
                  <div
                    key={i}
                    className={`flex aspect-square items-center justify-center rounded-full text-xs font-bold ${lleno ? "anim-sello" : ""}`}
                    style={
                      lleno
                        ? { background: "var(--marca-acento)", color: "var(--marca)", animationDelay: `${i * 40}ms` }
                        : { border: "2px dashed currentColor", opacity: 0.35 }
                    }
                  >
                    {lleno ? "✓" : i === meta - 1 ? "🎁" : ""}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-2.5 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full" style={{ width: `${progreso * 100}%`, background: "var(--marca-acento)" }} />
            </div>
          )}
          <p className="mt-4 text-sm opacity-85">
            {faltan > 0 ? (
              <>
                {faltan === 1 ? "Te falta 1 punto" : `Te faltan ${faltan} puntos`} para{" "}
                <strong>{objetivo.nombre}</strong>
              </>
            ) : (
              <>
                ¡Ya podés canjear <strong>{objetivo.nombre}</strong>!
              </>
            )}
          </p>
        </div>
      )}
    </section>
  );
}
