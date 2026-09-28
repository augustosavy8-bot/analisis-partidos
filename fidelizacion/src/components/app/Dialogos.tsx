"use client";

import { useEffect, useRef, useState } from "react";
import { claseBoton } from "./Boton";

type Pedido = {
  titulo: string;
  texto?: string;
  confirmar?: string;
  cancelar?: string;
  peligro?: boolean;
  resolver: (ok: boolean) => void;
};
const EVENTO = "pt-confirmar";

/**
 * Reemplazo de window.confirm() con el sistema de Point:
 *   if (await confirmar({ titulo: "¿Borrar?", peligro: true })) …
 */
export function confirmar(opciones: Omit<Pedido, "resolver">): Promise<boolean> {
  return new Promise((resolver) => {
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: { ...opciones, resolver } }));
  });
}

/** Diálogo modal (uno por layout). En celu se apoya abajo, como hoja. */
export function Dialogos() {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const alPedir = (e: Event) => setPedido((e as CustomEvent<Pedido>).detail);
    window.addEventListener(EVENTO, alPedir);
    return () => window.removeEventListener(EVENTO, alPedir);
  }, []);

  useEffect(() => {
    if (pedido && !ref.current?.open) ref.current?.showModal();
  }, [pedido]);

  function cerrar(ok: boolean) {
    pedido?.resolver(ok);
    ref.current?.close();
    setPedido(null);
  }

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        cerrar(false);
      }}
      onClick={(e) => e.target === ref.current && cerrar(false)}
      aria-labelledby="pt-dialogo-titulo"
      className="m-0 mt-auto w-full max-w-none bg-transparent p-0 backdrop:bg-pt-ink/40 backdrop:backdrop-blur-[2px] open:flex md:m-auto md:max-w-sm"
    >
      {pedido && (
        <div className="pt-subir w-full rounded-t-pt-lg bg-pt-pure p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-pt-flotante md:rounded-pt-lg md:pb-6">
          <h2 id="pt-dialogo-titulo" className="pt-app-seccion text-pt-ink">
            {pedido.titulo}
          </h2>
          {pedido.texto && <p className="mt-2 whitespace-pre-line pt-app-texto text-pt-ink-2">{pedido.texto}</p>}
          <div className="mt-6 flex flex-col-reverse gap-2 md:flex-row md:justify-end">
            <button type="button" onClick={() => cerrar(false)} className={claseBoton("secundario", "md", "w-full md:w-auto")}>
              {pedido.cancelar ?? "Cancelar"}
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => cerrar(true)}
              className={claseBoton("primario", "md", `w-full md:w-auto ${pedido.peligro ? "!bg-pt-error-ink hover:opacity-90" : ""}`)}
            >
              {pedido.confirmar ?? "Confirmar"}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
