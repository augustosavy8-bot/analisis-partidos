/** Piezas visuales compartidas del panel. */
export function Titulo({ children, accion }: { children: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>
      {accion}
    </div>
  );
}

export function Tarjeta({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70 ${className}`}>{children}</section>;
}

export function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-stone-500">{children}</p>;
}

export function BotonSecundario(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-50 ${props.className ?? ""}`}
    />
  );
}

export function BotonPrimario(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition disabled:opacity-50 ${props.className ?? ""}`}
      style={{ background: "var(--marca)", color: "var(--marca-texto)" }}
    />
  );
}

export const inputPanel =
  "block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base outline-none focus:border-[var(--marca)] focus:ring-2 focus:ring-[var(--marca)]/20 sm:text-sm";
