/** Controles de formulario de la app: radio pt-sm, borde pt-border y foco con el acento. */
const claseControl =
  "block w-full rounded-pt-sm border border-pt-border bg-pt-pure px-3.5 text-base text-pt-ink outline-none transition-[border-color,box-shadow] duration-150 ease-[var(--ease-pt)] placeholder:text-pt-ink-3 hover:border-pt-ink-3 focus:border-pt-accent-dark focus:ring-4 focus:ring-pt-accent/25 disabled:bg-pt-surface disabled:text-pt-ink-2";

export const claseInput = `${claseControl} h-pt-control`;
export const claseInputSm = `${claseControl} h-pt-control-sm text-[15px]`;
export const claseTextarea = `${claseControl} py-3`;

export function EtiquetaCampo({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-[13px] font-medium text-pt-ink">{children}</span>;
}

export function AyudaCampo({ children }: { children: React.ReactNode }) {
  return <span className="mt-1.5 block pt-app-detalle text-pt-ink-2">{children}</span>;
}

export function ErrorCampo({ mensaje }: { mensaje?: string | null }) {
  if (!mensaje) return null;
  return (
    <p role="alert" data-error-form className="pt-subir rounded-pt-sm bg-pt-error-soft px-4 py-3 pt-app-detalle text-pt-error-ink">
      {mensaje}
    </p>
  );
}

/** Checkbox con el acento. */
export const claseCheckbox = "h-5 w-5 shrink-0 rounded-[6px] border-pt-border accent-pt-accent-dark";
