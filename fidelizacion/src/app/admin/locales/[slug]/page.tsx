import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirSuperadmin } from "@/lib/admin";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { fechaHora } from "@/lib/panel";
import { env } from "@/lib/env";
import { Tarjeta, Titulo, Vacio } from "@/components/Panel";
import { AccionesChip, AccionesDueno, FormChip, FormDueno, InterruptorLocal } from "./Componentes";
import { GuiaChip } from "./GuiaChip";
import { formasTermino } from "@/lib/terminos";

export const metadata = { title: "Local" };

export default async function AdminLocal({ params }: PageProps<"/admin/locales/[slug]">) {
  const { slug } = await params;
  await requerirSuperadmin();
  const db = crearClienteAdmin();

  const { data: local } = await db
    .from("locales")
    .select("id, slug, nombre, rubro, activo, color_primario, color_secundario, minutos_entre_puntos, zona_horaria, termino_personal, created_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!local) notFound();

  const [{ data: miembros }, { data: mozos }, { data: chips }] = await Promise.all([
    db.from("miembros_local").select("user_id, created_at").eq("local_id", local.id),
    db.from("mozos").select("id, nombre, activo").eq("local_id", local.id).order("nombre"),
    db.from("chips").select("id, uid, etiqueta, modo, mozo_id, activo, ultimo_contador, ultimo_uso").eq("local_id", local.id).order("created_at"),
  ]);
  const duenos = await Promise.all(
    (miembros ?? []).map(async (m) => {
      const { data } = await db.auth.admin.getUserById(m.user_id);
      return { userId: m.user_id, email: data.user?.email ?? "(sin email)", ultimoIngreso: data.user?.last_sign_in_at ?? null };
    }),
  );
  const nombreMozo = new Map((mozos ?? []).map((m) => [m.id, m.nombre]));
  const tz = local.zona_horaria;
  const t = formasTermino(local.termino_personal);

  return (
    <>
      <Link href="/admin" className="text-sm text-stone-500">← Estado general</Link>
      <div className="mt-2">
        <Titulo accion={<InterruptorLocal slug={local.slug} activo={local.activo} />}>
          <span className="mr-2 inline-block h-4 w-4 rounded-full align-middle" style={{ background: local.color_primario }} />
          {local.nombre}
          {!local.activo && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 align-middle text-sm text-red-700">inactivo</span>}
        </Titulo>
      </div>
      <p className="-mt-3 mb-5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-500">
        <span>{local.rubro ?? "Sin rubro"}</span>
        <span>1 punto cada {+(local.minutos_entre_puntos / 60).toFixed(2)} h</span>
        <Link href={`/panel/${local.slug}`} className="underline">Ver su panel</Link>
        <Link href={`/t/${local.slug}`} className="underline">Tarjeta</Link>
        <Link href={`/mozo/${local.slug}`} className="underline">QR {t.plural}</Link>
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta>
          <h2 className="font-medium">Dueños</h2>
          {duenos.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">Sin dueños: nadie puede entrar al panel de este local.</p>
          ) : (
            <ul className="mt-3 divide-y divide-stone-100">
              {duenos.map((d) => (
                <li key={d.userId} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{d.email}</p>
                    <p className="text-xs text-stone-500">Último ingreso: {fechaHora(d.ultimoIngreso, tz)}</p>
                  </div>
                  <AccionesDueno localId={local.id} userId={d.userId} email={d.email} appUrl={env.appUrl} />
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 border-t border-stone-100 pt-4">
            <FormDueno localId={local.id} appUrl={env.appUrl} />
          </div>
        </Tarjeta>

        <Tarjeta>
          <h2 className="font-medium">{t.Plural}</h2>
          {!mozos?.length ? (
            <p className="mt-2 text-sm text-stone-500">Sin {t.plural}. Los carga el dueño desde su panel.</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {mozos.map((m) => (
                <li key={m.id} className={`rounded-full px-3 py-1 text-sm ring-1 ring-stone-200 ${m.activo ? "" : "opacity-50"}`}>
                  {m.nombre}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-stone-500">Para asignar un chip a alguien nuevo, primero el dueño lo tiene que crear en “{t.Plural}”.</p>
        </Tarjeta>
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-widest text-stone-500">Chips NFC</h2>
      {!chips?.length ? (
        <Vacio>Este local todavía no tiene chips.</Vacio>
      ) : (
        <Tarjeta className="!p-0 overflow-hidden">
          <ul className="divide-y divide-stone-100">
            {chips.map((c) => (
              <li key={c.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${c.activo ? "" : "opacity-60"}`}>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {c.etiqueta ?? c.uid}{" "}
                    <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${c.modo === "prueba" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                      {c.modo === "prueba" ? "prueba" : "producción"}
                    </span>
                    {!c.activo && <span className="ml-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">inactivo</span>}
                  </p>
                  <p className="font-mono text-xs text-stone-500">
                    UID {c.uid} · {c.mozo_id ? nombreMozo.get(c.mozo_id) : "sin asignar"} · último uso {fechaHora(c.ultimo_uso, tz)}
                    {c.modo === "produccion" && ` · contador ${c.ultimo_contador}`}
                  </p>
                </div>
                <AccionesChip chip={c} mozos={mozos ?? []} />
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
      <Tarjeta className="mt-4">
        <h3 className="mb-3 font-medium">Alta de chip</h3>
        <FormChip localId={local.id} mozos={mozos ?? []} etiqueta={t.Singular} />
      </Tarjeta>
      <div className="mt-4">
        <GuiaChip appUrl={env.appUrl} metaKey={process.env.NFC_SDM_META_KEY ?? null} />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-widest text-stone-500">Diseño de billetera</h2>
      <Tarjeta>
        <p className="text-sm text-stone-600">
          Se generan con los colores del local. Sirven para armar el pase en Pass2U (franja) y, más adelante, Apple y Google Wallet.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {[
            { titulo: "Franja con sellos (1125×432)", src: `/t/${local.slug}/franja?p=7`, archivo: `${local.slug}-franja.png` },
            { titulo: "Cabecera Google Wallet (1032×336)", src: `/t/${local.slug}/cabecera`, archivo: `${local.slug}-cabecera.png` },
          ].map((img) => (
            <figure key={img.src}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.src} alt={img.titulo} className="w-full rounded-xl ring-1 ring-stone-200" />
              <figcaption className="mt-2 flex items-center justify-between text-sm">
                <span className="text-stone-600">{img.titulo}</span>
                <a href={img.src} download={img.archivo} className="font-medium underline underline-offset-2">
                  Descargar
                </a>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-3 text-xs text-stone-500">
          La franja acepta <code>?p=</code> (sellos llenos) y <code>?m=</code> (total, hasta 15). Por defecto el total es el primer premio.
        </p>
      </Tarjeta>
    </>
  );
}
