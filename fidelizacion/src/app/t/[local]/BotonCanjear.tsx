"use client";

import { useTransition } from "react";
import { solicitarCanje } from "./actions";
import { Boton } from "@/components/app/Boton";

export function BotonCanjear({ slug, premioId, deshabilitado }: { slug: string; premioId: string; deshabilitado?: boolean }) {
  const [pendiente, startTransition] = useTransition();
  return (
    <Boton
      variante="acento"
      tamaño="sm"
      className="!rounded-full !px-4"
      onClick={() => startTransition(() => solicitarCanje(slug, premioId))}
      disabled={deshabilitado}
      pendiente={pendiente}
      textoPendiente="…"
    >
      Canjear
    </Boton>
  );
}
