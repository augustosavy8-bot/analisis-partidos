-- Pagar un pedido ya cancelado (su link de MP seguía activo) tomaba stock con
-- greatest(stock - cantidad, 0): se vendía más de lo que había. Ahora, sin stock,
-- el pedido no se marca pagado y el pago queda para reembolsar.
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
      -- Pagó después de que venció (o se canceló) la reserva: el stock ya se liberó.
      -- Si no alcanza, NO se marca pagado (antes se vendía más de lo que había): queda
      -- el pago registrado para que el superadmin lo reembolse, y se le avisa al comercio.
      if exists (select 1 from public.pedido_items i join public.productos pr on pr.id = i.producto_id
                  where i.pedido_id = ped.id and pr.stock < i.cantidad) then
        insert into public.avisos_comercio (comercio_id, tipo, titulo, texto)
        values (ped.comercio_id, 'pedido_sin_stock', 'Recibimos un pago del pedido #' || ped.numero || ' que ya no estaba vigente',
                'Ese pedido se había cancelado y ya no hay stock para enviarlo. Te devolvemos el dinero a la misma tarjeta.');
        return 'sin_stock';
      end if;
      update public.productos pr set stock = pr.stock - i.cantidad
        from public.pedido_items i where i.pedido_id = ped.id and pr.id = i.producto_id;
    end if;
    update public.pedidos set estado = 'pagado', pagado_en = now(), reserva_hasta = null where id = ped.id;
    insert into public.avisos_comercio (comercio_id, tipo, titulo, texto)
    values (ped.comercio_id, 'pedido_pagado', 'Recibimos el pago de tu pedido #' || ped.numero,
            case when ped.entrega = 'envio' then 'Lo preparamos y te avisamos cuando lo despachemos.'
                 else 'Lo preparamos y te avisamos cuando esté listo para retirar.' end);
    return 'pagado';
  end if;

  if p_estado in ('refunded', 'charged_back') then
    update public.pagos set reembolsado_centavos = p_monto_centavos where mp_payment_id = p_mp_payment_id;
    if ped.estado <> 'reembolsado'
       and not exists (select 1 from public.pagos where pedido_id = ped.id and estado = 'approved') then
      update public.pedidos set estado = 'reembolsado' where id = ped.id;
      return 'reembolsado';
    end if;
    return 'registrado';
  end if;

  return 'registrado';  -- pendiente, rechazado, en proceso: el pedido sigue esperando
end;
$$;
