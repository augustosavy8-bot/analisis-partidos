import Link from "next/link";

export type VarianteBoton = "primario" | "acento" | "secundario" | "fantasma" | "peligro";
export type TamañoBoton = "sm" | "md" | "lg";

const variantes: Record<VarianteBoton, string> = {
  primario: "bg-pt-ink text-white hover:bg-black",
  acento: "bg-pt-accent text-pt-ink hover:bg-pt-accent-dark",
  secundario: "bg-pt-pure text-pt-ink ring-1 ring-inset ring-pt-border hover:bg-pt-surface",
  fantasma: "text-pt-ink-2 hover:bg-pt-surface hover:text-pt-ink",
  peligro: "bg-pt-pure text-pt-error-ink ring-1 ring-inset ring-pt-border hover:bg-pt-error-soft",
};

const tamaños: Record<TamañoBoton, string> = {
  sm: "h-pt-control-sm gap-1.5 rounded-pt-sm px-3.5 text-[13px]",
  md: "h-11 gap-2 rounded-full px-5 text-[15px]",
  lg: "h-pt-control w-full gap-2 rounded-full px-6 text-[15px]",
};

/** Clases del botón de la app: pill, press de 150 ms, foco con el acento. */
export function claseBoton(variante: VarianteBoton = "primario", tamaño: TamañoBoton = "md", extra = "") {
  return `inline-flex shrink-0 items-center justify-center whitespace-nowrap font-[family-name:var(--font-pt-ui)] font-semibold transition-[background-color,color,transform,box-shadow] duration-150 ease-[var(--ease-pt)] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pt-accent-dark disabled:pointer-events-none disabled:opacity-50 ${variantes[variante]} ${tamaños[tamaño]} ${extra}`;
}

type PropsBoton = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBoton;
  tamaño?: TamañoBoton;
  /** Muestra "Un segundo…" y deshabilita. */
  pendiente?: boolean;
  textoPendiente?: string;
};

export function Boton({ variante, tamaño, pendiente, textoPendiente = "Un segundo…", className = "", children, ...props }: PropsBoton) {
  return (
    <button {...props} disabled={pendiente || props.disabled} aria-busy={pendiente || undefined} className={claseBoton(variante, tamaño, className)}>
      {pendiente ? textoPendiente : children}
    </button>
  );
}

type PropsLink = { href: string; variante?: VarianteBoton; tamaño?: TamañoBoton; className?: string; children: React.ReactNode; externo?: boolean; descargar?: string };

export function BotonLink({ href, variante, tamaño, className = "", children, externo, descargar }: PropsLink) {
  const clase = claseBoton(variante, tamaño, className);
  if (externo || descargar) {
    return (
      <a href={href} className={clase} download={descargar} {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={clase}>
      {children}
    </Link>
  );
}
