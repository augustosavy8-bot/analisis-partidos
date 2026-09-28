import type { Metadata } from "next";
import { Nav } from "@/components/landing/Nav";
import { FormInteres } from "@/app/interes/FormInteres";

export const metadata: Metadata = { title: "Sumá tu local" };

/** Formulario para dueños que prefieren dejar sus datos en lugar de escribir por WhatsApp. */
export default function Sumate() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-[760px] px-5 pb-24 pt-28 md:pt-36">
        <h1 className="pt-h1 text-pt-ink">Sumá tu local.</h1>
        <p className="pt-lead mt-4 text-pt-ink-2">Dejanos tus datos y te escribimos por WhatsApp para armar tu programa.</p>
        <div className="mt-10 rounded-pt-lg bg-pt-ink p-6 text-white shadow-pt-product md:p-10">
          <FormInteres />
        </div>
      </main>
    </>
  );
}
