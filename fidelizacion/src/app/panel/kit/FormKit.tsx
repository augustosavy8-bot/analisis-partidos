"use client";

import { useActionState, useState } from "react";
import { Boton } from "@/components/app/Boton";
import { formatearPesos } from "@/lib/facturacion/dinero";
import { crearPedidoKit, type EstadoPedido } from "./actions";

export type ProductoKit = {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  precioCentavos: number;
  stock: number;
  maxPorPedido: number;
};

const CAMPOS: { nombre: string; etiqueta: string; tipo?: string; auto?: string; opcional?: boolean; ancho?: boolean }[] = [
  { nombre: "nombre", etiqueta: "Quién recibe", auto: "name", ancho: true },
  { nombre: "telefono", etiqueta: "Teléfono", tipo: "tel", auto: "tel", ancho: true },
  { nombre: "calle", etiqueta: "Calle", auto: "address-line1" },
  { nombre: "numero", etiqueta: "Altura" },
  { nombre: "piso", etiqueta: "Piso / depto", opcional: true },
  { nombre: "cp", etiqueta: "Código postal", auto: "postal-code" },
  { nombre: "ciudad", etiqueta: "Ciudad", auto: "address-level2" },
  { nombre: "provincia", etiqueta: "Provincia", auto: "address-level1" },
];

/**
 * Armar el pedido. El total que se ve acá es sólo para mostrar: el servidor lo
 * vuelve a calcular con los precios de la base.
 */
export function FormKit({
  comercioId,
  productos,
  envioCentavos,
  direccionRetiro,
  minutosReserva,
}: {
  comercioId: string;
  productos: ProductoKit[];
  envioCentavos: number;
  direccionRetiro: string;
  minutosReserva: number;
}) {
  const [estado, accion, pendiente] = useActionState<EstadoPedido, FormData>(crearPedidoKit.bind(null, comercioId), {});
  const [cantidades, setCantidades] = useState<Record<string, number>>(() =>
    Object.fromEntries(productos.map((p) => [p.codigo, p.codigo === "kit_inicial" && p.stock > 0 ? 1 : 0])),
  );
  const [entrega, setEntrega] = useState<"envio" | "retiro">("envio");

  const subtotal = productos.reduce((t, p) => t + (cantidades[p.codigo] ?? 0) * p.precioCentavos, 0);
  const envio = entrega === "envio" ? envioCentavos : 0;
  const cambiar = (codigo: string, n: number, max: number) => setCantidades((c) => ({ ...c, [codigo]: Math.max(0, Math.min(max, n)) }));

  return (
    <form action={accion} className="grid gap-6">
      <fieldset className="grid gap-3">
        <legend className="pt-app-seccion mb-2 text-pt-ink">1. Qué querés</legend>
        {productos.map((p) => {
          const max = Math.min(p.stock, p.maxPorPedido);
          const n = cantidades[p.codigo] ?? 0;
          return (
            <div key={p.codigo} className="flex items-center gap-4 rounded-pt-card bg-pt-pure p-4 ring-1 ring-inset ring-pt-border">
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-semibold text-pt-ink">{p.nombre}</p>
                {p.descripcion && <p className="text-[13px] text-pt-ink-2">{p.descripcion}</p>}
                <p className="mt-1 text-[14px] tabular-nums text-pt-ink">
                  {formatearPesos(p.precioCentavos)}
                  {max === 0 && <span className="ml-2 font-semibold text-red-700">Agotado</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" aria-label={`Menos ${p.nombre}`} disabled={n === 0} onClick={() => cambiar(p.codigo, n - 1, max)} className="h-9 w-9 rounded-full bg-pt-surface text-[18px] font-semibold text-pt-ink disabled:opacity-40">
                  −
                </button>
                <span className="w-6 text-center tabular-nums text-[16px] font-semibold text-pt-ink">{n}</span>
                <button type="button" aria-label={`Más ${p.nombre}`} disabled={n >= max} onClick={() => cambiar(p.codigo, n + 1, max)} className="h-9 w-9 rounded-full bg-pt-surface text-[18px] font-semibold text-pt-ink disabled:opacity-40">
                  +
                </button>
                <input type="hidden" name={`cantidad_${p.codigo}`} value={n} />
              </div>
            </div>
          );
        })}
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="pt-app-seccion mb-2 text-pt-ink">2. Cómo lo recibís</legend>
        {(
          [
            ["envio", "Envío a domicilio", formatearPesos(envioCentavos)],
            ["retiro", `Retiro en ${direccionRetiro}`, "Gratis"],
          ] as const
        ).map(([valor, texto, precio]) => (
          <label key={valor} className={`flex cursor-pointer items-center gap-3 rounded-pt-card bg-pt-pure p-4 ring-inset ${entrega === valor ? "ring-2 ring-pt-ink" : "ring-1 ring-pt-border"}`}>
            <input type="radio" name="entrega" value={valor} checked={entrega === valor} onChange={() => setEntrega(valor)} className="h-4 w-4 accent-pt-ink" />
            <span className="flex-1 text-[15px] text-pt-ink">{texto}</span>
            <span className="text-[14px] tabular-nums text-pt-ink-2">{precio}</span>
          </label>
        ))}
        {entrega === "envio" && (
          <div className="grid grid-cols-2 gap-3 rounded-pt-card bg-pt-pure p-4 ring-1 ring-inset ring-pt-border">
            {CAMPOS.map((c) => (
              <label key={c.nombre} className={`grid gap-1 ${c.ancho ? "col-span-2" : ""}`}>
                <span className="text-[13px] font-medium text-pt-ink-2">
                  {c.etiqueta}
                  {c.opcional && " (opcional)"}
                </span>
                <input
                  name={c.nombre}
                  type={c.tipo ?? "text"}
                  autoComplete={c.auto}
                  required={!c.opcional}
                  className="h-11 rounded-pt-sm border border-pt-border bg-pt-pure px-3 text-[16px] text-pt-ink outline-none focus:border-pt-ink"
                />
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <section className="grid gap-3">
        <div className="rounded-pt-card bg-pt-pure p-4 ring-1 ring-inset ring-pt-border">
          <p className="flex justify-between text-[14px] text-pt-ink-2">
            <span>Productos</span>
            <span className="tabular-nums">{formatearPesos(subtotal)}</span>
          </p>
          <p className="mt-1 flex justify-between text-[14px] text-pt-ink-2">
            <span>Envío</span>
            <span className="tabular-nums">{envio ? formatearPesos(envio) : "Gratis"}</span>
          </p>
          <p className="mt-2 flex justify-between border-t border-pt-border/60 pt-2 text-[17px] font-semibold text-pt-ink">
            <span>Total</span>
            <span className="tabular-nums">{formatearPesos(subtotal + envio)}</span>
          </p>
        </div>
        {estado.error && (
          <p className="rounded-pt-sm bg-red-50 px-4 py-3 text-[14px] text-red-800" role="alert">
            {estado.error}
          </p>
        )}
        <Boton type="submit" pendiente={pendiente} textoPendiente="Te llevamos a Mercado Pago…" disabled={subtotal === 0}>
          Pagar con Mercado Pago
        </Boton>
        <p className="text-center text-[12px] text-pt-ink-3">
          Te reservamos el stock por {minutosReserva} minutos mientras pagás. El pago se hace en Mercado Pago. Tenés 10 días para arrepentirte
          (
          <a href="/terminos" target="_blank" className="underline underline-offset-2">
            términos
          </a>
          ).
        </p>
      </section>
    </form>
  );
}
