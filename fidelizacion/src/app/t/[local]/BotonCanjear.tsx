"use client";

import { useTransition } from "react";
import { solicitarCanje } from "./actions";

export function BotonCanjear({ slug, premioId, deshabilitado }: { slug: string; premioId: string; deshabilitado?: boolean }) {
  const [pendiente, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(() => solicitarCanje(slug, premioId))}
      disabled={pendiente || deshabilitado}
      className="rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
      style={{ background: "var(--marca)", color: "var(--marca-texto)" }}
    >
      {pendiente ? "…" : "Canjear"}
    </button>
  );
}
