-- =============================================================================
-- Fase 7: herramientas del superadmin (cortesías, pedidos, reembolsos).
-- Todo pasa por funciones: el historial queda registrado y las reglas
-- (qué transición de pedido es válida, cuándo se puede dar cortesía) viven acá.
-- =============================================================================

-- Dar o editar la cortesía de un comercio (plan sin cargo, con fin opcional).
-- No pisa una suscripción paga: para eso primero hay que cancelarla.
create or replace function public.admin_set_cortesia(
  p_comercio_id uuid,
  p_plan_id uuid,
  p_hasta timestamptz,
  p_actor uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  v_nueva uuid;
begin
  perform 1 from public.comercios where id = p_comercio_id for update;
  if not found then raise exception 'comercio inexistente' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.planes where id = p_plan_id) then
    raise exception 'plan inexistente' using errcode = '22023';
  end if;

  select * into s from public.suscripciones where comercio_id = p_comercio_id and estado <> 'cancelled' limit 1;
  if found and s.estado <> 'cortesia' then
    return 'tiene_suscripcion_paga';
  end if;

  if found then
    update public.suscripciones set plan_id = p_plan_id, cortesia_hasta = p_hasta where id = s.id;
    insert into public.historial_suscripcion (suscripcion_id, de_estado, a_estado, de_plan_id, a_plan_id, motivo, origen, actor)
    values (s.id, 'cortesia', 'cortesia', s.plan_id, p_plan_id,
            'Cortesía editada' || coalesce(' hasta ' || to_char(p_hasta at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY'), ' sin fin'),
            'admin', p_actor);
    return 'editada';
  end if;

  insert into public.suscripciones (comercio_id, plan_id, estado, cortesia_hasta)
  values (p_comercio_id, p_plan_id, 'cortesia', p_hasta)
  returning id into v_nueva;
  insert into public.historial_suscripcion (suscripcion_id, a_estado, a_plan_id, motivo, origen, actor)
  values (v_nueva, 'cortesia', p_plan_id, 'Cortesía otorgada', 'admin', p_actor);
  insert into public.avisos_comercio (comercio_id, tipo, titulo, texto)
  values (p_comercio_id, 'cortesia', 'Point te regaló el plan sin cargo',
          case when p_hasta is null then 'Disfrutalo sin fecha de fin.'
               else 'Es sin cargo hasta el ' || to_char(p_hasta at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY') || '.' end);
  return 'creada';
end;
$$;

-- Avanzar un pedido pagado: preparando → enviado / listo para retirar → entregado.
create or replace function public.admin_estado_pedido(p_pedido_id uuid, p_estado text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
  v_validas text[];
begin
  select * into p from public.pedidos where id = p_pedido_id for update;
  if not found then return 'inexistente'; end if;
  v_validas := case p.estado
    when 'pagado'       then array['preparando', 'enviado', 'listo_retiro']
    when 'preparando'   then array['enviado', 'listo_retiro']
    when 'enviado'      then array['entregado']
    when 'listo_retiro' then array['entregado']
    else array[]::text[]
  end;
  if not p_estado = any(v_validas) then return 'transicion_invalida'; end if;
  if p_estado = 'enviado' and p.entrega <> 'envio' then return 'transicion_invalida'; end if;
  if p_estado = 'listo_retiro' and p.entrega <> 'retiro' then return 'transicion_invalida'; end if;

  update public.pedidos set estado = p_estado where id = p.id;
  if p_estado in ('enviado', 'listo_retiro') then
    insert into public.avisos_comercio (comercio_id, tipo, titulo, texto)
    values (p.comercio_id, 'pedido_' || p_estado,
            case p_estado when 'enviado' then 'Despachamos tu pedido #' || p.numero
                          else 'Tu pedido #' || p.numero || ' está listo para retirar' end,
            case p_estado when 'enviado' then 'Ya está en camino.'
                          else 'Pasá a retirarlo cuando quieras.' end);
  end if;
  return 'ok';
end;
$$;

-- Reembolso total hecho en MP: el pedido pasa a reembolsado y, si no se
-- despachó, el stock vuelve.
create or replace function public.admin_reembolso_pedido(p_pedido_id uuid, p_mp_payment_id text, p_devolver_stock boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
begin
  select * into p from public.pedidos where id = p_pedido_id for update;
  if not found then return 'inexistente'; end if;
  if p.estado not in ('pagado', 'preparando', 'enviado', 'listo_retiro', 'entregado') then return 'no_pagado'; end if;

  update public.pagos set estado = 'refunded', reembolsado_centavos = monto_centavos where mp_payment_id = p_mp_payment_id and pedido_id = p.id;
  if p_devolver_stock then
    update public.productos pr set stock = pr.stock + i.cantidad
      from public.pedido_items i where i.pedido_id = p.id and pr.id = i.producto_id;
  end if;
  update public.pedidos set estado = 'reembolsado' where id = p.id;
  insert into public.avisos_comercio (comercio_id, tipo, titulo, texto)
  values (p.comercio_id, 'pedido_reembolsado', 'Te devolvimos el pago del pedido #' || p.numero,
          'El reintegro se ve en tu medio de pago en los próximos días.');
  return 'ok';
end;
$$;

revoke execute on function public.admin_set_cortesia(uuid, uuid, timestamptz, uuid) from public, anon, authenticated;
revoke execute on function public.admin_estado_pedido(uuid, text) from public, anon, authenticated;
revoke execute on function public.admin_reembolso_pedido(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.admin_set_cortesia(uuid, uuid, timestamptz, uuid) to service_role;
grant execute on function public.admin_estado_pedido(uuid, text) to service_role;
grant execute on function public.admin_reembolso_pedido(uuid, text, boolean) to service_role;
