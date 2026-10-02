import { requerirSuperadmin } from "@/lib/admin";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { fechaHora } from "@/lib/panel";
import { Tarjeta, Titulo, Vacio } from "@/components/Panel";
import { formatearPesos } from "@/lib/facturacion/dinero";
import { BotonAccion } from "../Componentes";
import { avanzarPedido, reembolsarPedido } from "../actions";
import { Subnav } from "../Subnav";

export const metadata = { title: "Pedidos" };
const TZ = "America/Argentina/Buenos_Aires";

/** Próximos pasos posibles de un pedido pagado (la base vuelve a validar). */
function siguientes(estado: string, entrega: string): [string, string][] {
  const despacho: [string, string] = entrega === "envio" ? ["enviado", "Marcar enviado"] : ["listo_retiro", "Listo para retirar"];
  if (estado === "pagado") return [["preparando", "Preparando"], despacho];
  if (estado === "preparando") return [despacho];
  if (estado === "enviado" || estado === "listo_retiro") return [["entregado", "Entregado"]];
  return [];
}

export default async function PedidosAdmin({ searchParams }: PageProps<"/admin/facturacion/pedidos">) {
  await requerirSuperadmin();
  const sp = await searchParams;
  const todos = sp.todos === "1";
  const db = crearClienteAdmin();
  let q = db
    .from("pedidos")
    .select("id, numero, estado, entrega, direccion, total_centavos, costo_envio_centavos, regalo, created_at, pagado_en, comercios(nombre), pedido_items(cantidad, productos(nombre))")
    .order("created_at", { ascending: false })
    .limit(100);
  if (!todos) q = q.in("estado", ["pagado", "preparando", "enviado", "listo_retiro"]);
  const { data: pedidos } = await q;

  return (
    <>
      <Titulo>Pedidos</Titulo>
      <Subnav actual="/admin/facturacion/pedidos" />
      <p className="mb-4 text-sm text-stone-500">
        {todos ? "Todos los pedidos (últimos 100)." : "Pedidos pagados que falta entregar."}{" "}
        <a href={todos ? "?" : "?todos=1"} className="underline">
          {todos ? "Ver sólo los pendientes" : "Ver todos"}
        </a>
      </p>
      {(pedidos ?? []).length === 0 ? (
        <Vacio>Nada pendiente. 👌</Vacio>
      ) : (
        <div className="grid gap-3">
          {(pedidos ?? []).map((p) => {
            const items = p.pedido_items as unknown as { cantidad: number; productos: { nombre: string } }[];
            const d = p.direccion as Record<string, string | null> | null;
            const pagado = ["pagado", "preparando", "enviado", "listo_retiro", "entregado"].includes(p.estado);
            return (
              <Tarjeta key={p.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">
                    #{p.numero} · {(p.comercios as unknown as { nombre: string } | null)?.nombre}
                  </p>
                  <p className="text-sm">
                    {p.regalo && <span className="mr-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-800">incluido en el plan</span>}
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium">{p.estado}</span>{" "}
                    <span className="tabular-nums">{formatearPesos(p.total_centavos)}</span>
                  </p>
                </div>
                <p className="mt-1 text-sm text-stone-600">{items.map((i) => `${i.cantidad} × ${i.productos.nombre}`).join(" · ")}</p>
                <p className="mt-1 text-xs text-stone-500">
                  {p.entrega === "envio" && d
                    ? `Envío a ${d.nombre} · ${d.telefono} · ${d.calle} ${d.numero}${d.piso ? ` (${d.piso})` : ""}, ${d.ciudad}, ${d.provincia} (${d.cp})`
                    : p.regalo
                      ? "Coordinar la entrega con el dueño (envío o retiro)"
                      : "Retira en persona"}
                  {" · "}pedido {fechaHora(p.created_at, TZ)}
                  {p.pagado_en && ` · pagado ${fechaHora(p.pagado_en, TZ)}`}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {siguientes(p.estado, p.entrega).map(([estado, texto]) => (
                    <BotonAccion key={estado} accion={avanzarPedido.bind(null, p.id, estado)}>
                      {texto}
                    </BotonAccion>
                  ))}
                  {pagado && p.total_centavos > 0 && (
                    <BotonAccion
                      peligro
                      confirmar={`¿Devolver ${formatearPesos(p.total_centavos)} del pedido #${p.numero}? ${p.estado === "enviado" || p.estado === "entregado" ? "Ya se despachó: el stock NO vuelve." : "El stock vuelve."}`}
                      accion={reembolsarPedido.bind(null, p.id, !(p.estado === "enviado" || p.estado === "entregado"))}
                    >
                      Reembolsar
                    </BotonAccion>
                  )}
                </div>
              </Tarjeta>
            );
          })}
        </div>
      )}
    </>
  );
}
