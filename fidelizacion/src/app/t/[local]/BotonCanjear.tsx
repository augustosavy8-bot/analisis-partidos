"use client";

import { useTransition } from "react";
import { solicitarCanje } from "./actions";
import { Boton } from "@/components/app/Boton";

export function BotonCanjear({ slug, premioId }: { slug: string; premioId: string }) {
  const [pendiente, startTransition] = useTransition();
  return (
    <Boton
      variante="acento"
      tamaño="sm"
      className="!rounded-full !px-4"
      onClick={() => startTransition(() => solicitarCanje(slug, premioId))}
      pendiente={pendiente}
      textoPendiente="…"
    >
      Canjear
    </Boton>
  );
}
