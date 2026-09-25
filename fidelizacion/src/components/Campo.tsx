export function Campo(props: React.InputHTMLAttributes<HTMLInputElement> & { etiqueta: string; ayuda?: string }) {
  const { etiqueta, ayuda, ...input } = props;
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">{etiqueta}</span>
      <input
        {...input}
        className="mt-1.5 block h-[52px] w-full rounded-2xl border-0 bg-stone-900/[0.04] px-4 text-base text-stone-900 outline-none ring-1 ring-inset ring-stone-900/10 transition placeholder:text-stone-400 focus:bg-white focus:ring-2 focus:ring-[var(--marca)]"
      />
      {ayuda && <span className="mt-1 block text-xs text-stone-500">{ayuda}</span>}
    </label>
  );
}

export function BotonMarca({ children, pendiente, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendiente?: boolean }) {
  return (
    <button
      {...props}
      disabled={pendiente || props.disabled}
      className="w-full rounded-2xl px-4 py-4 text-base font-semibold transition active:scale-[0.99] disabled:opacity-60"
      style={{
        background: "linear-gradient(180deg, color-mix(in oklab, var(--marca), white 8%), var(--marca))",
        color: "var(--marca-texto)",
        boxShadow: "0 1px 0 rgb(255 255 255 / 0.15) inset, 0 10px 24px -12px var(--marca)",
      }}
    >
      {pendiente ? "Un segundo…" : children}
    </button>
  );
}

export function ErrorForm({ mensaje }: { mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <p role="alert" data-error-form className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
      {mensaje}
    </p>
  );
}
