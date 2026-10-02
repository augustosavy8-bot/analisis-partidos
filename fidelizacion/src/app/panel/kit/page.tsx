import Link from "next/link";
import { Encabezado, Seccion, Superficie } from "@/components/app/Superficie";
import { Vacio } from "@/components/Panel";
import { requerirUsuario } from "@/lib/panel";
import { env } from "@/lib/env";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { comercioDelUsuario } from "@/lib/facturacion/comercio";
import { configFacturacion, productosPublicos } from "@/lib/facturacion/catalogo";
import { formatearPesos } from "@/lib/facturacion/dinero";
import { FormKit } from "./FormKit";
import { ESTADOS_PEDIDO } from "./estados";
import { Marco } from "./Marco";

export const metadata = { title: "Comprar chips", robots: { index: false } };

const fecha = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(iso));

export default async function Kit() {
  await requerirUsuario();
  const comercio = await comercioDelUsuario();
  if (!comercio) {
    return (
      <Marco>
        <Vacio titulo="Todavía no tenés un comercio" ilustracion={false}>
          Creá tu cuenta en <Link href="/sumate" className="underline underline-offset-4">/sumate</Link> para comprar chips.
        </Vacio>
      </Marco>
    );
  }
  const admin = crearClienteAdmin();
  await admin.rpc("liberar_reservas_vencidas");
  const [productos, cfg, { data: pedidos }] = await Promise.all([
    productosPublicos(),
    configFacturacion(),
    admin
      .from("pedidos")
      .select("id, numero, estado, entrega, total_centavos, created_at")
      .eq("comercio_id", comercio.id)
      .neq("estado", "cancelado")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <Marco>
      <Encabezado sobre={comercio.nombre} titulo="Comprar chips" detalle="Los llaveros NFC que tu equipo apoya en el celular de cada cliente." />
      {env.mpConfigurado ? (
        <FormKit
          comercioId={comercio.id}
          productos={productos.map((p) => ({
            codigo: p.codigo,
            nombre: p.nombre,
            descripcion: p.descripcion,
            precioCentavos: p.precioCentavos,
            stock: p.stock,
            maxPorPedido: p.maxPorPedido,
          }))}
          envioCentavos={cfg.costoEnvioCentavos}
          direccionRetiro={cfg.direccionRetiro}
          minutosReserva={cfg.minutosReservaStock}
        />
      ) : (
        <Vacio titulo="Los pagos todavía no están configurados" ilustracion={false}>
          Probá de nuevo en un rato.
        </Vacio>
      )}
      {pedidos && pedidos.length > 0 && (
        <Seccion titulo="Tus pedidos">
          <Superficie as="ul" className="divide-y divide-pt-border/60">
            {pedidos.map((p) => {
              const e = ESTADOS_PEDIDO[p.estado] ?? { texto: p.estado, tono: "text-pt-ink-2" };
              return (
                <li key={p.id}>
                  <Link href={`/panel/kit/resultado?pedido=${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-[15px] text-pt-ink hover:bg-pt-bg">
                    <span>
                      #{p.numero} · {fecha(p.created_at)}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="tabular-nums">{formatearPesos(p.total_centavos)}</span>
                      <span className={`text-[13px] font-semibold ${e.tono}`}>{e.texto}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </Superficie>
        </Seccion>
      )}
    </Marco>
  );
}
