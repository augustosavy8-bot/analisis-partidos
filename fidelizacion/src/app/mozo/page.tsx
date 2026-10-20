import Link from "next/link";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { LogoPoint } from "@/components/landing/LogoPoint";
import { Insignia } from "@/components/app/Superficie";
import { claseBoton } from "@/components/app/Boton";
import { Icono } from "@/components/Icono";
import { UltimoLocal } from "./UltimoLocal";

export const metadata = { title: "Generar QR", robots: { index: false } };

/**
 * Entrada al QR de respaldo desde la home: el personal busca su local y va a
 * /mozo/<local> (ahí entra con su PIN). El celular recuerda el último local.
 */
export default async function BuscarLocal({ searchParams }: PageProps<"/mozo">) {
  const { q } = await searchParams;
  const texto = (typeof q === "string" ? q : "").trim().slice(0, 60);
  const resultados = texto.length >= 2 ? await buscar(texto) : null;

  return (
    <div className="pt-app flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <Link href="/" aria-label="POINT, inicio">
          <LogoPoint />
        </Link>
        <div className="mt-10">
          <Insignia tono="acento">Para el equipo del local</Insignia>
          <h1 className="pt-app-titulo mt-2.5 text-pt-ink">Generar QR</h1>
          <p className="mt-1.5 pt-app-texto text-pt-ink-2">
            Para clientes con celulares sin NFC: buscá tu local, entrá con tu PIN y mostrales el QR para que sumen.
          </p>
        </div>

        <UltimoLocal />

        <form action="/mozo" className="mt-6 flex gap-2">
          <input
            name="q"
            defaultValue={texto}
            placeholder="Nombre del local"
            autoComplete="off"
            autoFocus={!texto}
            className="h-pt-control min-w-0 flex-1 rounded-pt-sm bg-pt-pure px-4 pt-app-texto text-pt-ink ring-1 ring-pt-border focus:outline-none focus:ring-2 focus:ring-pt-ink"
          />
          <button type="submit" className={claseBoton("primario")}>
            Buscar
          </button>
        </form>

        {resultados && (
          <div className="mt-4">
            {resultados.length === 0 ? (
              <p className="pt-app-detalle text-pt-ink-2">No encontramos ningún local con “{texto}”. Probá con otra parte del nombre.</p>
            ) : (
              <ul className="divide-y divide-pt-border overflow-hidden rounded-pt-card bg-pt-pure ring-1 ring-pt-border/60">
                {resultados.map((l) => (
                  <li key={l.slug}>
                    <Link href={`/mozo/${l.slug}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-pt-bg">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-medium text-pt-ink">{l.nombre}</span>
                        {l.rubro && <span className="block truncate pt-app-detalle text-pt-ink-2">{l.rubro}</span>}
                      </span>
                      <Icono nombre="chevron" tamaño={18} className="text-pt-ink-2" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

async function buscar(texto: string) {
  const patron = `%${texto.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const { data } = await crearClienteAdmin()
    .from("locales")
    .select("slug, nombre, rubro")
    .eq("activo", true)
    .ilike("nombre", patron)
    .order("nombre")
    .limit(8);
  return data ?? [];
}
