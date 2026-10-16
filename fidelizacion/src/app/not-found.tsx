import { BotonLink } from "@/components/app/Boton";
import { Mascota } from "@/components/app/Mascota";

export const metadata = { title: "No encontramos esta página", robots: { index: false } };

/** 404 de toda la web (también lo usan los notFound() de las páginas). */
export default function NoEncontrada() {
  return (
    <div className="pt-app flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <Mascota estado="pensando" tamaño={140} />
        <h1 className="pt-app-titulo mt-5 text-pt-ink">No encontramos esta página</h1>
        <p className="mt-2 pt-app-texto text-pt-ink-2">Puede que el link esté mal escrito o que la página ya no exista.</p>
        <BotonLink href="/" variante="secundario" className="mt-8">
          Volver al inicio
        </BotonLink>
      </main>
    </div>
  );
}
