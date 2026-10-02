-- =============================================================================
-- Ajustes comerciales (2/10/2026):
--  - Se deja de vender el kit de 10: sólo chips sueltos ($10.000 c/u).
--  - Clientes por plan: Básico 50, Pro 200, Max ilimitados.
--  - Cada plan incluye 1 llavero NFC (una vez por comercio): se genera un pedido
--    sin cargo al dar de alta la suscripción.
-- =============================================================================
update public.productos set activo = false where codigo = 'kit_inicial';
update public.productos set precio_centavos = 1000000, descripcion = 'Un llavero NFC para tu equipo.' where codigo = 'chip';

update public.planes set limites = jsonb_set(limites, '{clientes}', '50') where codigo = 'basico';
update public.planes set limites = jsonb_set(limites, '{clientes}', '200') where codigo = 'pro';
update public.planes set limites = jsonb_set(limites, '{clientes}', 'null') where codigo = 'max';

-- Ítems sin cargo (el chip incluido en el plan).
alter table public.pedido_items drop constraint pedido_items_precio_unitario_centavos_check;
alter table public.pedido_items add constraint pedido_items_precio_unitario_centavos_check check (precio_unitario_centavos >= 0);

alter table public.pedidos add column regalo boolean not null default false;
create unique index pedidos_un_regalo_por_comercio on public.pedidos (comercio_id) where regalo;

create or replace function public.registrar_alta_suscripcion(
  p_comercio_id uuid,
  p_plan_id uuid,
  p_mp_preapproval_id text,
  p_payer_email text,
  p_precio_centavos integer,
  p_estado text,
  p_trial_ends_at timestamptz,
  p_current_period_end timestamptz,
  p_actor uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_susc uuid;
  v_cortesia record;
  v_chip uuid;
  v_pedido uuid;
begin
  if p_estado not in ('trialing', 'pending', 'authorized') then
    raise exception 'estado inicial inválido: %', p_estado using errcode = '22023';
  end if;

  select id into v_susc from public.suscripciones where mp_preapproval_id = p_mp_preapproval_id;
  if v_susc is not null then
    return v_susc;
  end if;

  -- Bloquea la fila del comercio: serializa altas concurrentes del mismo comercio.
  perform 1 from public.comercios where id = p_comercio_id for update;

  for v_cortesia in
    select id, estado, plan_id from public.suscripciones
     where comercio_id = p_comercio_id and estado = 'cortesia'
  loop
    update public.suscripciones set estado = 'cancelled', cancelada_en = now() where id = v_cortesia.id;
    insert into public.historial_suscripcion (suscripcion_id, de_estado, a_estado, de_plan_id, a_plan_id, motivo, origen, actor)
    values (v_cortesia.id, 'cortesia', 'cancelled', v_cortesia.plan_id, v_cortesia.plan_id, 'Pasó a suscripción paga', 'panel', p_actor);
  end loop;

  insert into public.suscripciones (
    comercio_id, plan_id, estado, mp_preapproval_id, mp_payer_email, precio_centavos, trial_ends_at, current_period_end
  ) values (
    p_comercio_id, p_plan_id, p_estado, p_mp_preapproval_id, p_payer_email, p_precio_centavos, p_trial_ends_at, p_current_period_end
  )
  returning id into v_susc;

  insert into public.historial_suscripcion (suscripcion_id, a_estado, a_plan_id, motivo, origen, actor)
  values (v_susc, p_estado, p_plan_id, 'Alta de la suscripción', 'panel', p_actor);

  insert into public.avisos_comercio (comercio_id, tipo, titulo, texto)
  values (
    p_comercio_id, 'suscripcion_alta', '¡Tu cuenta está activa!',
    case when p_estado = 'trialing'
      then 'Empezó tu prueba gratis. El primer cobro llega el ' || to_char(p_trial_ends_at at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY') || '.'
      else 'Tu suscripción quedó activa.'
    end
  );

  -- Cada plan incluye 1 llavero NFC, una sola vez por comercio (volver a
  -- suscribirse no regala otro). Pedido sin cargo para despachar desde /admin.
  if not exists (select 1 from public.pedidos where comercio_id = p_comercio_id and regalo) then
    select id into v_chip from public.productos where codigo = 'chip';
    if v_chip is not null then
      insert into public.pedidos (comercio_id, estado, entrega, subtotal_centavos, costo_envio_centavos, total_centavos, pagado_en, regalo)
      values (p_comercio_id, 'pagado', 'retiro', 0, 0, 0, now(), true)
      returning id into v_pedido;
      insert into public.pedido_items (pedido_id, producto_id, cantidad, precio_unitario_centavos) values (v_pedido, v_chip, 1, 0);
      update public.productos set stock = greatest(stock - 1, 0) where id = v_chip;
      insert into public.avisos_comercio (comercio_id, tipo, titulo, texto)
      values (p_comercio_id, 'chip_incluido', 'Tu plan incluye un llavero NFC',
              'Te contactamos para coordinar la entrega. Mientras tanto podés sumar puntos con el QR de tu equipo.');
    end if;
  end if;

  update public.comercios set alta_en_curso_hasta = null where id = p_comercio_id;
  return v_susc;
end;
$$;
