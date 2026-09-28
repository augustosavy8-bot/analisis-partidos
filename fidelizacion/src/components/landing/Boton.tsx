import Link from "next/link";

type Props = {
  href: string;
  children: React.ReactNode;
  variante?: "primario" | "secundario" | "oscuro" | "claro";
  className?: string;
  externo?: boolean;
  /** Texto accesible (por ej. a dónde lleva el link). */
  etiqueta?: string;
};

const estilos = {
  primario: "bg-pt-ink text-white hover:bg-black",
  secundario: "bg-transparent text-pt-ink ring-1 ring-inset ring-pt-border hover:bg-pt-surface",
  oscuro: "bg-pt-accent text-pt-ink hover:bg-pt-accent-dark",
  claro: "bg-white/10 text-white ring-1 ring-inset ring-white/15 hover:bg-white/15",
};

/** Botón pill (radio 999px), microinteracción de 200ms. */
export function Boton({ href, children, variante = "primario", className = "", externo, etiqueta }: Props) {
  const clase = `inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 pt-ui !text-[15px] transition-[background-color,transform] duration-200 ease-[var(--ease-pt)] active:scale-[0.98] ${estilos[variante]} ${className}`;
  return externo ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={clase} aria-label={etiqueta}>
      {children}
    </a>
  ) : (
    <Link href={href} className={clase}>
      {children}
    </Link>
  );
}
