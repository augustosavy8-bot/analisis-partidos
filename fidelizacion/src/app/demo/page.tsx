import { notFound } from "next/navigation";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import { env } from "@/lib/env";
import { clienteActual } from "@/lib/sesion-cliente";
import { olvidarCelular } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Demo" };

// Tokens del seed (públicos, sólo para desarrollo). La base guarda sólo su hash.
const TOKENS_SEED: Record<string, string> = {
  "04DE000000A001": "V3T9H9CbnTQPmJVstgnPn1SV",
  "04DE000000A002": "j7BouD2PYHicm51uzVMZO8tH",
};

/**
 * Página de verificación de la Fase 1: muestra lo que cargó el seed.
 * Sólo existe con PERMITIR_MODO_PRUEBA=true.
 */
export default async function Demo() {
  if (!env.permitirModoPrueba) notFound();

  const db = crearClienteAdmin();
  const cliente = await clienteActual();
  const { data: locales, error } = await db
    .from("locales")
    .select(
      "id, slug, nombre, rubro, color_primario, color_secundario, minutos_entre_puntos, " +
        "mozos(id, nombre, activo), chips(id, uid, etiqueta, modo, mozo_id, activo), " +
        "premios(id, nombre, puntos_necesarios, activo)",
    )
    .order("created_at");

  if (error) {
    return (
      <main className="mx-auto w-full max-w-2xl p-6">
        <h1 className="text-xl font-semibold">No se pudo leer la base</h1>
        <pre className="mt-4 overflow-auto rounded-lg bg-red-50 p-4 text-sm text-red-800">{error.message}</pre>
      </main>
    );
  }

  type Fila = {
    id: string; slug: string; nombre: string; rubro: string | null;
    color_primario: string; color_secundario: string; minutos_entre_puntos: number;
    mozos: { id: string; nombre: string; activo: boolean }[];
    chips: { id: string; uid: string; etiqueta: string | null; modo: string; mozo_id: string | null; activo: boolean }[];
    premios: { id: string; nombre: string; puntos_necesarios: number; activo: boolean }[];
  };

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-stone-500">Fase 1 · verificación</p>
        <h1 className="text-2xl font-semibold tracking-tight">Demo</h1>
        <p className="mt-1 text-sm text-stone-600">
          Tocá “Simular toque” para hacer de cuenta que el mozo apoyó su llavero en tu celular.
        </p>
      </header>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 text-sm shadow-sm">
        <h2 className="font-medium">Este celular</h2>
        {cliente ? (
          <p className="mt-1 text-stone-600">
            Registrado como <strong className="text-stone-900">{cliente.nombre}</strong>.
          </p>
        ) : (
          <p className="mt-1 text-stone-600">Sin tarjeta todavía: el primer toque te va a pedir tus datos.</p>
        )}
        {cliente && (
          <form action={olvidarCelular} className="mt-3">
            <button className="rounded-lg border border-stone-300 px-3 py-2 font-medium text-stone-700">
              Olvidar este celular
            </button>
            <p className="mt-1 text-xs text-stone-500">Para volver a probar el registro. Tu tarjeta no se borra: la podés recuperar con tu WhatsApp.</p>
          </form>
        )}
      </section>

      {(locales as unknown as Fila[]).map((local) => (
        <section key={local.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="p-5 text-white" style={{ background: local.color_primario }}>
            <p className="text-sm opacity-80">{local.rubro}</p>
            <h2 className="text-xl font-semibold">{local.nombre}</h2>
            <p className="mt-1 text-sm opacity-80">
              1 punto cada {local.minutos_entre_puntos} min
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/t/${local.slug}`} className="rounded-full bg-white/15 px-4 py-2 text-sm font-medium">
                Ver mi tarjeta →
              </Link>
              <Link href={`/mozo/${local.slug}`} className="rounded-full bg-white/15 px-4 py-2 text-sm font-medium">
                Modo mozo (QR) →
              </Link>
            </div>
          </div>
          <div className="grid gap-5 p-5 text-sm">
            <div>
              <h3 className="mb-2 font-medium">Mozos</h3>
              <ul className="space-y-1 text-stone-700">
                {local.mozos.map((m) => (
                  <li key={m.id}>{m.nombre}{m.activo ? "" : " (inactivo)"}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 font-medium">Chips</h3>
              <ul className="space-y-3">
                {local.chips.map((c) => {
                  const mozo = local.mozos.find((m) => m.id === c.mozo_id);
                  const token = TOKENS_SEED[c.uid];
                  return (
                    <li key={c.id} className="rounded-lg bg-stone-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{c.etiqueta ?? c.uid}</span>
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ background: local.color_secundario, color: local.color_primario }}
                        >
                          {c.modo}
                        </span>
                      </div>
                      <p className="text-stone-500">UID {c.uid} · {mozo?.nombre ?? "sin mozo"}</p>
                      {c.modo === "prueba" && token && (
                        <>
                          <a
                            href={`/n?t=${token}`}
                            className="mt-3 block rounded-xl px-4 py-3 text-center font-semibold"
                            style={{ background: local.color_primario, color: "#fff" }}
                          >
                            Simular toque de {mozo?.nombre ?? "este chip"}
                          </a>
                          <p className="mt-2 break-all font-mono text-xs text-stone-500">
                            {env.appUrl}/n?t={token}
                          </p>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 font-medium">Premios</h3>
              <ul className="space-y-1 text-stone-700">
                {local.premios.map((p) => (
                  <li key={p.id}>{p.nombre} — {p.puntos_necesarios} puntos</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ))}
    </main>
  );
}
