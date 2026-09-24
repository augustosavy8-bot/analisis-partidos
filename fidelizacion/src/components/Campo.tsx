export function Campo(props: React.InputHTMLAttributes<HTMLInputElement> & { etiqueta: string; ayuda?: string }) {
  const { etiqueta, ayuda, ...input } = props;
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">{etiqueta}</span>
      <input
        {...input}
        className="mt-1.5 block w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-[var(--marca)] focus:ring-2 focus:ring-[var(--marca)]/20"
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
      className="w-full rounded-xl px-4 py-3.5 text-base font-semibold shadow-sm transition active:scale-[0.99] disabled:opacity-60"
      style={{ background: "var(--marca)", color: "var(--marca-texto)" }}
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
