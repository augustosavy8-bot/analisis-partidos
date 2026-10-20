import { notFound } from "next/navigation";
import { buscarLocal } from "@/lib/locales";
import { mozoActual } from "@/lib/sesion-mozo";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { CabeceraLocal } from "@/components/CabeceraLocal";
import { formasTermino } from "@/lib/terminos";
import { LoginMozo } from "./LoginMozo";
import { Insignia } from "@/components/app/Superficie";
import { PantallaQR } from "./PantallaQR";

export const metadata = { title: "QR de respaldo", robots: { index: false } };

export default async function Mozo({ params }: PageProps<"/mozo/[local]">) {
  const { local: slug } = await params;
  const local = await buscarLocal(slug);
  if (!local) notFound();

  const mozo = await mozoActual(slug);

  return (
    <div className="pt-app flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <CabeceraLocal local={local} />
        {mozo ? (
          <div className="mt-8 flex flex-1 flex-col">
            <PantallaQR slug={slug} nombre={mozo.nombre} />
          </div>
        ) : (
          <>
            <div className="mt-10">
              <Insignia tono="acento">
                Para {formasTermino(local.termino_personal).plural}
              </Insignia>
              <h1 className="pt-app-titulo mt-2.5 text-pt-ink">
                QR de respaldo
              </h1>
              <p className="mt-1.5 pt-app-texto text-pt-ink-2">
                Para clientes con celulares sin NFC: mostrás un QR y lo escanean
                con la cámara.
              </p>
            </div>
            <div className="mt-6 rounded-pt-card bg-pt-pure p-5 shadow-pt-ui ring-1 ring-pt-border/60">
              <LoginMozo slug={slug} mozos={await mozosConPin(local.id)} />
            </div>
          </>
        )}
      </main>
    </div>
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
