-- =============================================================================
-- Fase 6: venta del kit de chips NFC (Checkout Pro, pago único).
--
-- Flujo: el comercio arma el pedido → crear_pedido RESERVA el stock por N minutos
-- (config_facturacion.minutos_reserva_stock) → paga en Mercado Pago → el webhook
-- (o la vuelta desde MP) confirma con registrar_pago_pedido. Si no paga a tiempo,
-- liberar_reservas_vencidas devuelve el stock.
--
-- productos.stock es el stock DISPONIBLE: las reservas ya están descontadas.
-- =============================================================================

-- Devuelve al stock lo reservado por pedidos impagos cuya reserva venció.
create or replace function public.liberar_reservas_vencidas()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer := 0;
  p record;
begin
  for p in
    select id from public.pedidos
     where estado = 'pendiente_pago' and reserva_hasta < now()
     for update skip locked
  loop
    update public.productos pr set stock = pr.stock + i.cantidad
      from public.pedido_items i where i.pedido_id = p.id and pr.id = i.producto_id;
    update public.pedidos set estado = 'expirado', reserva_hasta = null where id = p.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- Cancela un pedido impago y devuelve su stock (el comercio arma otro, o falló MP).
create or replace function public.cancelar_pedido_impago(p_pedido_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.pedidos where id = p_pedido_id and estado = 'pendiente_pago' for update;
  if not found then return false; end if;
  update public.productos pr set stock = pr.stock + i.cantidad
    from public.pedido_items i where i.pedido_id = p_pedido_id and pr.id = i.producto_id;
  update public.pedidos set estado = 'cancelado', reserva_hasta = null where id = p_pedido_id;
  return true;
end;
$$;

-- Crea el pedido y reserva el stock, todo o nada. Precios y envío salen de la
-- base (el navegador sólo manda códigos y cantidades).
-- p_items: [{"codigo": "kit_inicial", "cantidad": 1}, ...]
create or replace function public.crear_pedido(
  p_comercio_id uuid,
  p_items jsonb,
  p_entrega text,
  p_direccion jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pedido uuid;
  v_subtotal integer := 0;
  v_envio integer := 0;
  v_minutos integer;
  v_item record;
  v_prod record;
  v_anterior uuid;
begin
  if p_entrega not in ('envio', 'retiro') then
    return jsonb_build_object('ok', false, 'motivo', 'entrega_invalida');
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    return jsonb_build_object('ok', false, 'motivo', 'sin_items');
  end if;

  perform public.liberar_reservas_vencidas();

  -- Un pedido impago por comercio: si había otro, se cancela y su stock vuelve
  -- (si no, alguien podría acaparar el stock armando pedidos sin pagar).
  for v_anterior in select id from public.pedidos where comercio_id = p_comercio_id and estado = 'pendiente_pago' loop
    perform public.cancelar_pedido_impago(v_anterior);
  end loop;

  select coalesce(minutos_reserva_stock, 30), costo_envio_centavos into v_minutos, v_envio from public.config_facturacion limit 1;
  if p_entrega = 'retiro' then v_envio := 0; end if;

  insert into public.pedidos (comercio_id, entrega, direccion, subtotal_centavos, costo_envio_centavos, total_centavos, reserva_hasta)
  values (p_comercio_id, p_entrega, case when p_entrega = 'envio' then p_direccion end, 0, v_envio, v_envio, now() + make_interval(mins => v_minutos))
  returning id into v_pedido;

  for v_item in
    select (e->>'codigo') as codigo, sum((e->>'cantidad')::integer) as cantidad
      from jsonb_array_elements(p_items) e
     group by 1
     order by 1  -- siempre el mismo orden de bloqueo: evita deadlocks entre pedidos simultáneos
  loop
    if v_item.cantidad is null or v_item.cantidad <= 0 then continue; end if;
    -- FOR UPDATE: dos pedidos simultáneos por el último kit → uno espera al otro.
    select id, precio_centavos, stock, max_por_pedido, nombre into v_prod
      from public.productos where codigo = v_item.codigo and activo for update;
    if not found then raise exception 'producto_inexistente' using errcode = 'P0001'; end if;
    if v_item.cantidad > v_prod.max_por_pedido then
      raise exception 'max_por_pedido:%:%', v_prod.nombre, v_prod.max_por_pedido using errcode = 'P0001';
    end if;
    if v_item.cantidad > v_prod.stock then
      raise exception 'sin_stock:%:%', v_prod.nombre, v_prod.stock using errcode = 'P0001';
    end if;
    update public.productos set stock = stock - v_item.cantidad where id = v_prod.id;
    insert into public.pedido_items (pedido_id, producto_id, cantidad, precio_unitario_centavos)
    values (v_pedido, v_prod.id, v_item.cantidad, v_prod.precio_centavos);
    v_subtotal := v_subtotal + v_item.cantidad * v_prod.precio_centavos;
  end loop;

  if v_subtotal = 0 then raise exception 'sin_items' using errcode = 'P0001'; end if;
  update public.pedidos set subtotal_centavos = v_subtotal, total_centavos = v_subtotal + v_envio where id = v_pedido;

  return jsonb_build_object('ok', true, 'pedido_id', v_pedido,
    'total_centavos', v_subtotal + v_envio,
    'reserva_hasta', (select reserva_hasta from public.pedidos where id = v_pedido));
exception
  when sqlstate 'P0001' then
    -- La excepción deshace todo lo de este bloque (pedido, ítems y stock).
    return jsonb_build_object('ok', false, 'motivo', sqlerrm);
end;
$$;

-- Un pago de MP para un pedido. Idempotente por mp_payment_id. Sólo un pago
-- APROBADO por el MONTO EXACTO marca el pedido como pagado.
create or replace function public.registrar_pago_pedido(
  p_pedido_id uuid,
  p_mp_payment_id text,
  p_estado text,
  p_status_detail text,
  p_monto_centavos integer,
  p_medio text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  ped record;
begin
  select * into ped from public.pedidos where id = p_pedido_id for update;
  if not found then return 'pedido_inexistente'; end if;

  insert into public.pagos (pedido_id, mp_payment_id, estado, status_detail, monto_centavos, medio)
  values (p_pedido_id, p_mp_payment_id, p_estado, p_status_detail, p_monto_centavos, p_medio)
  on conflict (mp_payment_id) do update set estado = excluded.estado, status_detail = excluded.status_detail,
    monto_centavos = excluded.monto_centavos, medio = coalesce(excluded.medio, public.pagos.medio);

  if p_estado = 'approved' then
    if ped.estado = 'pagado' or ped.estado in ('preparando', 'enviado', 'listo_retiro', 'entregado') then
      return 'ya_pagado';
    end if;
    if p_monto_centavos <> ped.total_centavos then
      return 'monto_distinto';  -- no se marca: lo revisa el superadmin
    end if;
    if ped.estado in ('expirado', 'cancelado') then
      -- Pagó después de que venció la reserva: se vuelve a tomar el stock (lo que haya).
      update public.productos pr set stock = greatest(pr.stock - i.cantidad, 0)
        from public.pedido_items i where i.pedido_id = ped.id and pr.id = i.producto_id;
    end if;
    update public.pedidos set estado = 'pagado', pagado_en = now(), reserva_hasta = null where id = ped.id;
    insert into public.avisos_comercio (comercio_id, tipo, titulo, texto)
    values (ped.comercio_id, 'pedido_pagado', 'Recibimos el pago de tu pedido #' || ped.numero,
            case when ped.entrega = 'envio' then 'Lo preparamos y te avisamos cuando lo despachemos.'
                 else 'Lo preparamos y te avisamos cuando esté listo para retirar.' end);
    return 'pagado';
  end if;

  if p_estado in ('refunded', 'charged_back') and ped.estado not in ('reembolsado') then
    update public.pedidos set estado = 'reembolsado' where id = ped.id;
    update public.pagos set reembolsado_centavos = p_monto_centavos where mp_payment_id = p_mp_payment_id;
    return 'reembolsado';
  end if;

  return 'registrado';  -- pendiente, rechazado, en proceso: el pedido sigue esperando
end;
$$;

revoke execute on function public.liberar_reservas_vencidas() from public, anon, authenticated;
revoke execute on function public.cancelar_pedido_impago(uuid) from public, anon, authenticated;
revoke execute on function public.crear_pedido(uuid, jsonb, text, jsonb) from public, anon, authenticated;
revoke execute on function public.registrar_pago_pedido(uuid, text, text, text, integer, text) from public, anon, authenticated;
grant execute on function public.liberar_reservas_vencidas() to service_role;
grant execute on function public.cancelar_pedido_impago(uuid) to service_role;
grant execute on function public.crear_pedido(uuid, jsonb, text, jsonb) to service_role;
grant execute on function public.registrar_pago_pedido(uuid, text, text, text, integer, text) to service_role;
