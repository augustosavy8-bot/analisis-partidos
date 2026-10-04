/** Etiqueta chica arriba de un título. */
export function Etiqueta({ children, oscuro }: { children: React.ReactNode; oscuro?: boolean }) {
  return <p className={`pt-label uppercase ${oscuro ? "text-white/50" : "text-pt-ink-3"}`}>{children}</p>;
}
