import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { estiloMarca } from "@/lib/locales";
import { tarjetaPorPase } from "@/lib/billetera";
import { formatearFecha, premiosDelLocal, proximoPremio, tarjetaDelCliente } from "@/lib/tarjeta";
import { TarjetaVisual } from "@/components/TarjetaVisual";
import { textoMovimiento } from "@/lib/movimientos";

export const metadata: Metadata = { title: "Mi tarjeta", robots: { index: false } };

/** Vista de sólo lectura de la tarjeta, abierta desde la billetera (sin cookie). */
export default async function Pase({ params }: PageProps<"/w/[serial]/[token]">) {
  const { serial, token } = await params;
  const pase = await tarjetaPorPase(serial, token);
  if (!pase) notFound();
  const { local } = pase;

  const [tarjeta, premios] = await Promise.all([tarjetaDelCliente(pase.clienteId, local.id), premiosDelLocal(local.id)]);
  if (!tarjeta) notFound();
  const objetivo = proximoPremio(premios, tarjeta.puntos);
  const canjeables = premios.filter((p) => tarjeta.puntos >= p.puntos_necesarios);

  return (
    <main style={estiloMarca(local)} className="mx-auto w-full max-w-md flex-1 px-4 pb-16 pt-6">
      <p className="px-2 text-stone-600">
        Hola, <span className="font-semibold text-stone-900">{pase.nombre.split(" ")[0]}</span>
      </p>
      <TarjetaVisual local={local} puntos={tarjeta.puntos} objetivo={objetivo} titular={pase.nombre} desde={tarjeta.created_at} serial={tarjeta.serial} />

      {canjeables.length > 0 && (
        <p className="mt-4 rounded-2xl px-4 py-3 text-sm" style={{ background: "var(--marca-acento)", color: "var(--marca)" }}>
          🎁 Ya podés canjear: <strong>{canjeables.map((p) => p.nombre).join(", ")}</strong>. Pedíselo al{" "}
          {local.nombre} y canjealo desde tu tarjeta.
        </p>
      )}

      {tarjeta.movimientos.length > 0 && (
        <section className="mt-6">
          <h2 className="px-2 text-sm font-semibold uppercase tracking-widest text-stone-500">Últimos movimientos</h2>
          <ul className="mt-3 divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200/70">
            {tarjeta.movimientos.slice(0, 8).map((m) => (
              <li key={m.id} className="flex justify-between px-4 py-3 text-sm">
                <span>{textoMovimiento(m)}</span>
                <span className="text-stone-500">{formatearFecha(m.created_at, local.zona_horaria)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link
        href={`/t/${local.slug}`}
        className="mt-8 block rounded-xl border border-stone-300 bg-white px-4 py-3 text-center text-sm font-medium text-stone-700"
      >
        Abrir la tarjeta completa (para canjear)
      </Link>
      <p className="mt-2 text-center text-xs text-stone-500">
        Si te pide tus datos, tocá “Recuperala con tu WhatsApp”.
      </p>
    </main>
  );
}
