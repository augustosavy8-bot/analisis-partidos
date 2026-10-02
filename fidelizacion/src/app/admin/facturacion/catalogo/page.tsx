import { requerirSuperadmin } from "@/lib/admin";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { Tarjeta, Titulo } from "@/components/Panel";
import { leerLimites } from "@/lib/facturacion/planes";
import { centavosAPesos } from "@/lib/facturacion/dinero";
import { FormAdmin, claseCampo } from "../Componentes";
import { guardarConfig, guardarPlan, guardarProducto } from "../actions";
import { Subnav } from "../Subnav";

export const metadata = { title: "Planes y productos" };

export default async function CatalogoAdmin() {
  await requerirSuperadmin();
  const db = crearClienteAdmin();
  const [{ data: planes }, { data: productos }, { data: cfg }] = await Promise.all([
    db.from("planes").select("id, codigo, nombre, precio_centavos, precio_lista_centavos, promo_texto, dias_prueba, limites, activo, destacado").order("orden"),
    db.from("productos").select("id, codigo, nombre, descripcion, precio_centavos, stock, max_por_pedido, activo").order("orden"),
    db.from("config_facturacion").select("costo_envio_centavos, minutos_reserva_stock, dias_gracia, dias_sumar_tras_gracia, direccion_retiro").single(),
  ]);

  return (
    <>
      <Titulo>Planes y productos</Titulo>
      <Subnav actual="/admin/facturacion/catalogo" />

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-stone-500">Planes</h2>
      <p className="mb-3 text-sm text-stone-500">
        Cambiar el precio afecta sólo a las altas nuevas: los suscriptos actuales siguen pagando lo que pactaron. Límites vacíos = ilimitado.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {(planes ?? []).map((p) => {
          const l = leerLimites(p.limites);
          return (
            <Tarjeta key={p.id}>
              <p className="mb-3 font-medium">
                {p.nombre} <span className="text-sm font-normal text-stone-500">({p.codigo})</span>
              </p>
              <FormAdmin accion={guardarPlan.bind(null, p.id)}>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Campo etiqueta="Nombre" name="nombre" defaultValue={p.nombre} />
                  <Campo etiqueta="Precio ($/mes)" name="precio" defaultValue={String(centavosAPesos(p.precio_centavos))} />
                  <Campo etiqueta="Precio tachado ($, vacío = sin promo)" name="precio_lista" defaultValue={p.precio_lista_centavos ? String(centavosAPesos(p.precio_lista_centavos)) : ""} />
                  <Campo etiqueta="Texto de la promo" name="promo_texto" defaultValue={p.promo_texto ?? ""} />
                  <Campo etiqueta="Días de prueba" name="dias_prueba" type="number" defaultValue={String(p.dias_prueba)} />
                  <Campo etiqueta="Locales" name="locales" defaultValue={l.locales?.toString() ?? ""} />
                  <Campo etiqueta="Clientes" name="clientes" defaultValue={l.clientes?.toString() ?? ""} />
                  <Campo etiqueta="Premios" name="premios" defaultValue={l.premios?.toString() ?? ""} />
                  <label className="text-stone-600">
                    Estadísticas
                    <select name="estadisticas" defaultValue={l.estadisticas} className={`${claseCampo} mt-1`}>
                      <option value="basicas">Básicas</option>
                      <option value="avanzadas">Avanzadas</option>
                    </select>
                  </label>
                  <div className="flex flex-col justify-end gap-1 text-stone-600">
                    <Check name="promos" etiqueta="Promos" defaultChecked={l.promos} />
                    <Check name="mensajes" etiqueta="Mensajes" defaultChecked={l.mensajes} />
                    <Check name="diseno" etiqueta="Logo e imágenes propias" defaultChecked={l.diseno} />
                    <Check name="destacado" etiqueta="Recomendado" defaultChecked={p.destacado} />
                    <Check name="activo" etiqueta="Activo (se ofrece)" defaultChecked={p.activo} />
                  </div>
                </div>
              </FormAdmin>
            </Tarjeta>
          );
        })}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-widest text-stone-500">Productos</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {(productos ?? []).map((p) => (
          <Tarjeta key={p.id}>
            <p className="mb-3 font-medium">
              {p.nombre} <span className="text-sm font-normal text-stone-500">({p.codigo})</span>
            </p>
            <FormAdmin accion={guardarProducto.bind(null, p.id)}>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Campo etiqueta="Nombre" name="nombre" defaultValue={p.nombre} />
                <Campo etiqueta="Precio ($)" name="precio" defaultValue={String(centavosAPesos(p.precio_centavos))} />
                <Campo etiqueta="Stock disponible" name="stock" type="number" defaultValue={String(p.stock)} />
                <Campo etiqueta="Máximo por pedido" name="max_por_pedido" type="number" defaultValue={String(p.max_por_pedido)} />
                <label className="col-span-2 text-stone-600">
                  Descripción
                  <input name="descripcion" defaultValue={p.descripcion ?? ""} className={`${claseCampo} mt-1`} />
                </label>
                <Check name="activo" etiqueta="Activo (se vende)" defaultChecked={p.activo} />
              </div>
            </FormAdmin>
          </Tarjeta>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-widest text-stone-500">Configuración</h2>
      {cfg && (
        <Tarjeta>
          <FormAdmin accion={guardarConfig}>
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <Campo etiqueta="Envío ($)" name="envio" defaultValue={String(centavosAPesos(cfg.costo_envio_centavos))} />
              <Campo etiqueta="Reserva de stock (min)" name="reserva" type="number" defaultValue={String(cfg.minutos_reserva_stock)} />
              <Campo etiqueta="Días de gracia" name="gracia" type="number" defaultValue={String(cfg.dias_gracia)} />
              <Campo etiqueta="Días sumando tras la gracia" name="sumar" type="number" defaultValue={String(cfg.dias_sumar_tras_gracia)} />
              <label className="col-span-2 text-stone-600 md:col-span-4">
                Dirección de retiro
                <input name="direccion" defaultValue={cfg.direccion_retiro} className={`${claseCampo} mt-1`} />
              </label>
            </div>
          </FormAdmin>
        </Tarjeta>
      )}
    </>
  );
}

function Campo({ etiqueta, ...props }: { etiqueta: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="text-stone-600">
      {etiqueta}
      <input {...props} className={`${claseCampo} mt-1`} />
    </label>
  );
}

function Check({ etiqueta, ...props }: { etiqueta: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" {...props} className="h-4 w-4" />
      {etiqueta}
    </label>
  );
}
