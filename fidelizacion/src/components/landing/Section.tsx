/** Sección de la landing: contenedor de 1280px con el aire de la dirección de arte. */
export function Section({
  id,
  children,
  className = "",
  contenedor = true,
  tono = "claro",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
  contenedor?: boolean;
  tono?: "claro" | "blanco" | "oscuro";
}) {
  const fondo = tono === "oscuro" ? "bg-pt-ink text-white" : tono === "blanco" ? "bg-pt-pure" : "bg-pt-bg";
  return (
    <section id={id} className={`relative scroll-mt-16 ${fondo} ${className}`}>
      {contenedor ? <div className="mx-auto w-full max-w-[1280px] px-5 md:px-8">{children}</div> : children}
    </section>
  );
}

/** Etiqueta chica arriba de un título. */
export function Etiqueta({ children, oscuro }: { children: React.ReactNode; oscuro?: boolean }) {
  return <p className={`pt-label uppercase ${oscuro ? "text-white/50" : "text-pt-ink-3"}`}>{children}</p>;
}
