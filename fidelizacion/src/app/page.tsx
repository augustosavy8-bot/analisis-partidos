import Link from "next/link";

export default function Inicio() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-16">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-xl font-semibold text-white">
        +1
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
          La tarjeta de puntos que se suma con un toque.
        </h1>
        <p className="text-stone-600">
          Te apoyan un llavero en el celular y listo: sumaste. Sin apps, sin papelitos.
        </p>
      </div>
      <div className="flex flex-col gap-3 text-sm">
        <Link
          href="/panel"
          className="rounded-xl bg-stone-900 px-4 py-3 text-center font-medium text-white transition hover:bg-stone-800"
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
