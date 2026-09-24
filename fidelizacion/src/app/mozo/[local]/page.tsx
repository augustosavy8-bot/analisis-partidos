import { notFound } from "next/navigation";
import { buscarLocal, estiloMarca } from "@/lib/locales";
import { mozoActual } from "@/lib/sesion-mozo";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { CabeceraLocal } from "@/components/CabeceraLocal";
import { formasTermino } from "@/lib/terminos";
import { LoginMozo } from "./LoginMozo";
import { PantallaQR } from "./PantallaQR";

export const metadata = { title: "QR de respaldo", robots: { index: false } };

export default async function Mozo({ params }: PageProps<"/mozo/[local]">) {
  const { local: slug } = await params;
  const local = await buscarLocal(slug);
  if (!local) notFound();

  const mozo = await mozoActual(slug);

  return (
    <main style={estiloMarca(local)} className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-8 pt-8">
      <CabeceraLocal local={local} />
      {mozo ? (
        <div className="mt-8 flex flex-1 flex-col">
          <PantallaQR slug={slug} nombre={mozo.nombre} />
        </div>
      ) : (
        <>
          <div className="mt-10 space-y-2">
            <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--marca)" }}>
              Para {formasTermino(local.termino_personal).plural}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-stone-900">QR de respaldo</h1>
            <p className="text-stone-600">Para clientes con celulares sin NFC: mostrás un QR y lo escanean con la cámara.</p>
          </div>
          <div className="mt-8">
            <LoginMozo slug={slug} mozos={await mozosConPin(local.id)} />
          </div>
        </>
      )}
    </main>
  );
}

async function mozosConPin(localId: string) {
  const { data } = await crearClienteAdmin()
    .from("mozos")
    .select("id, nombre")
    .eq("local_id", localId)
    .eq("activo", true)
    .not("pin_hash", "is", null)
    .order("nombre");
  return data ?? [];
}
