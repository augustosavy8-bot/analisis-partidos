import { LogoPoint } from "@/components/MarcaPoint";
import Link from "next/link";

export default function Inicio() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-16">
      <LogoPoint alto={44} />
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
          La tarjeta de puntos que se suma con un <span className="text-[#E6633A]">toque</span>.
        </h1>
        <p className="text-stone-600">
          Te apoyan un llavero en el celular y listo: sumaste. Sin apps, sin papelitos.
        </p>
      </div>
      <div className="flex flex-col gap-3 text-sm">
        <Link
          href="/panel"
          className="rounded-2xl bg-[#0F172A] px-4 py-3.5 text-center font-semibold text-white shadow-[0_10px_24px_-12px_#0F172A] transition hover:bg-[#1e293b]"
        >
          Soy dueño de un local
        </Link>
        <p className="text-center text-stone-500">
          ¿Sos cliente? Pedile a quien te atiende que apoye su llavero en tu celular.
        </p>
      </div>
    </main>
  );
}
