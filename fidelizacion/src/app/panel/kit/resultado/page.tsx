import Link from "next/link";
import { notFound } from "next/navigation";
import { Encabezado, Seccion, Superficie } from "@/components/app/Superficie";
import { BotonLink } from "@/components/app/Boton";
import { Icono } from "@/components/Icono";
import { requerirUsuario } from "@/lib/panel";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { comercioDelUsuario } from "@/lib/facturacion/comercio";
import { configFacturacion } from "@/lib/facturacion/catalogo";
import { formatearPesos } from "@/lib/facturacion/dinero";
import { obtenerPagoMp } from "@/lib/facturacion/mp";
import { registrarPagoDePedido } from "@/lib/facturacion/webhooks";
import { ESTADOS_PEDIDO } from "../estados";
import { Marco } from "../Marco";

export const metadata = { title: "Tu pedido", robots: { index: false } };

/**
 * Vuelta desde Checkout Pro (y detalle de un pedido). MP agrega `payment_id` a la
 * URL, pero la URL la puede escribir cualquiera: con ese id CONSULTAMOS el pago a
 * MP y recién ahí lo registramos. Así el pedido queda pagado aunque el webhook
 * tarde o no llegue.
 */
export default async function Resultado({ searchParams }: PageProps<"/panel/kit/resultado">) {
  await requerirUsuario();
  const sp = await searchParams;
  const pedidoId = typeof sp.pedido === "string" ? sp.pedido : "";
  const paymentId = typeof sp.payment_id === "string" && /^\d{1,20}$/.test(sp.payment_id) ? sp.payment_id : null;

  const admin = crearClienteAdmin();
  const { data: pedido } = await admin
    .from("pedidos")
    .select("id, numero, comercio_id, estado, entrega, direccion, subtotal_centavos, costo_envio_centavos, total_centavos, reserva_hasta, created_at, pedido_items(cantidad, precio_unitario_centavos, productos(nombre))")
    .eq("id", pedidoId)
    .maybeSingle();
  // Sólo el dueño del comercio (o el superadmin) ve el pedido.
  if (!pedido || !(await comercioDelUsuario(pedido.comercio_id))) notFound();

  let estado = pedido.estado;
  let rechazado = false;
  if (paymentId && estado === "pendiente_pago") {
    try {
      const pago = await obtenerPagoMp(paymentId);
      if (pago.external_reference === pedido.id) {
        await registrarPagoDePedido(pago);
        rechazado = pago.status === "rejected";
        const { data: nuevo } = await admin.from("pedidos").select("estado").eq("id", pedido.id).single();
        estado = nuevo?.estado ?? estado;
      }
    } catch (e) {
      console.error("Verificación del pago del kit", paymentId, e instanceof Error ? e.message : e);
    }
  }

  const cfg = await configFacturacion();
  const e = ESTADOS_PEDIDO[estado] ?? { texto: estado, tono: "text-pt-ink-2" };
  const pagado = !["pendiente_pago", "expirado", "cancelado"].includes(estado);
  const items = pedido.pedido_items as unknown as { cantidad: number; precio_unitario_centavos: number; productos: { nombre: string } }[];
  const dir = pedido.direccion as { calle?: string; numero?: string; piso?: string | null; ciudad?: string; provincia?: string; cp?: string } | null;

  return (
    <Marco>
      <Encabezado sobre={`Pedido #${pedido.numero}`} titulo={pagado ? "¡Gracias por tu compra!" : rechazado ? "El pago no se aprobó" : "Tu pedido"} />
      <Superficie className="p-5">
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${pagado ? "bg-pt-accent-soft text-pt-accent-ink" : "bg-amber-50 text-amber-800"}`} aria-hidden>
            <Icono nombre={pagado ? "check" : "historial"} tamaño={20} />
          </span>
          <div>
            <p className={`text-[17px] font-semibold ${e.tono}`}>{e.texto}</p>
            <p className="mt-1 pt-app-detalle text-pt-ink-2">
              {pagado
                ? pedido.entrega === "envio"
                  ? "Lo preparamos y te avisamos cuando lo despachemos."
                  : `Te avisamos cuando esté listo para retirar en ${cfg.direccionRetiro}.`
                : estado === "pendiente_pago"
                  ? rechazado
                    ? "Mercado Pago rechazó el pago. Podés probar con otro medio armando el pedido de nuevo."
                    : "Todavía no recibimos el pago. Si ya pagaste, en unos minutos se actualiza."
                  : "Este pedido no se pagó a tiempo y se liberó el stock. Podés armar uno nuevo."}
            </p>
          </div>
        </div>
      </Superficie>

      <Seccion titulo="Detalle">
        <Superficie as="ul" className="divide-y divide-pt-border/60">
          {items.map((i) => (
            <li key={i.productos.nombre} className="flex justify-between px-5 py-3 text-[15px] text-pt-ink">
              <span>
                {i.cantidad} × {i.productos.nombre}
              </span>
              <span className="tabular-nums">{formatearPesos(i.cantidad * i.precio_unitario_centavos)}</span>
            </li>
          ))}
          <li className="flex justify-between px-5 py-3 text-[15px] text-pt-ink-2">
            <span>{pedido.entrega === "envio" ? "Envío" : "Retiro"}</span>
            <span className="tabular-nums">{pedido.costo_envio_centavos ? formatearPesos(pedido.costo_envio_centavos) : "Gratis"}</span>
          </li>
          <li className="flex justify-between px-5 py-3 text-[16px] font-semibold text-pt-ink">
            <span>Total</span>
            <span className="tabular-nums">{formatearPesos(pedido.total_centavos)}</span>
          </li>
        </Superficie>
        {dir && (
          <p className="mt-3 pt-app-detalle text-pt-ink-2">
            Envío a {dir.calle} {dir.numero}
            {dir.piso ? ` (${dir.piso})` : ""}, {dir.ciudad}, {dir.provincia} ({dir.cp})
          </p>
        )}
      </Seccion>

      <div className="mt-8 flex flex-wrap gap-2">
        {!pagado && <BotonLink href="/panel/kit">Armar el pedido de nuevo</BotonLink>}
        <BotonLink href="/panel" variante="secundario">
          Ir a mi panel
        </BotonLink>
        <Link href="/panel/kit" className="self-center px-3 text-[14px] font-semibold text-pt-ink-2 underline underline-offset-2">
          Ver mis pedidos
        </Link>
      </div>
    </Marco>
  );
}
