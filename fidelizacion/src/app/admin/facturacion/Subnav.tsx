import Link from "next/link";

const SECCIONES = [
  ["/admin/facturacion", "Resumen"],
  ["/admin/facturacion/pedidos", "Pedidos"],
  ["/admin/facturacion/eventos", "Eventos de pago"],
  ["/admin/facturacion/catalogo", "Planes y productos"],
] as const;

export function Subnav({ actual }: { actual: string }) {
  return (
    <nav className="mb-5 flex flex-wrap gap-2 text-sm">
      {SECCIONES.map(([href, nombre]) => (
        <Link
          key={href}
          href={href}
          className={`rounded-full px-3 py-1.5 font-medium ${actual === href ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}
        >
          {nombre}
        </Link>
      ))}
    </nav>
  );
}
