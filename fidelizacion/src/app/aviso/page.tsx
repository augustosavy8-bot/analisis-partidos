import { BotonLink } from "@/components/app/Boton";
import { MENSAJES_AVISO as MENSAJES } from "@/lib/avisos";

export const metadata = { title: "Aviso" };


const GENERICO = { titulo: "Algo salió mal", texto: "Probá de nuevo en un ratito." };

export default async function Aviso({ searchParams }: PageProps<"/aviso">) {
  const { m, l } = await searchParams;
  // Si venía de la tarjeta de un local, el botón vuelve ahí (sólo un slug, nunca una URL).
  const slug = typeof l === "string" && /^[a-z0-9-]{1,60}$/.test(l) ? l : null;
  const msg = (typeof m === "string" && MENSAJES[m]) || GENERICO;
  return (
    <div className="pt-app flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-pt-warning-soft font-[family-name:var(--font-pt-display)] text-2xl font-bold text-pt-warning-ink" aria-hidden>
          !
        </span>
        <h1 className="pt-app-titulo mt-5 text-pt-ink">{msg.titulo}</h1>
        <p className="mt-2 pt-app-texto text-pt-ink-2">{msg.texto}</p>
        <BotonLink href={slug ? `/t/${slug}` : "/"} variante="secundario" className="mt-8">
          {slug ? "Volver a mi tarjeta" : "Volver al inicio"}
        </BotonLink>
      </main>
    </div>
  );
}
