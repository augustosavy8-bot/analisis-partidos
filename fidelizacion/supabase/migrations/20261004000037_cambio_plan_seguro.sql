-- =============================================================================
-- Cambio de plan: cerrar "Max al precio de Básico".
--
-- Antes: subir era inmediato (sin cobrar la diferencia) y bajar quedaba programado
-- para fin de período. Subir a Max y enseguida pedir Básico dejaba usar Max todo
-- el mes y que MP cobrara Básico; repetible cada mes.
--
-- Ahora: si el plan actual se consiguió subiendo DESPUÉS del último cobro aprobado
-- (o sea, todavía no se pagó), bajar es inmediato. Sólo se conserva hasta fin de
-- período un plan que efectivamente se pagó.
-- Además, un cambio de plan a la vez por suscripción (reserva de 60 s), para que
-- dos pedidos en paralelo no dejen el monto de MP distinto del de la base.
-- =============================================================================

alter table public.suscripciones add column if not exists cambio_plan_hasta timestamptz;

create or replace function public.reservar_cambio_plan(p_suscripcion_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with r as (
    update public.suscripciones set cambio_plan_hasta = now() + interval '60 seconds'
     where id = p_suscripcion_id and (cambio_plan_hasta is null or cambio_plan_hasta < now())
    returning 1
  )
  select exists (select 1 from r);
$$;

create or replace function public.liberar_cambio_plan(p_suscripcion_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.suscripciones set cambio_plan_hasta = null where id = p_suscripcion_id;
$$;

-- ¿El plan actual se pagó? false si se subió a este plan después del último cobro aprobado.
create or replace function public.plan_actual_pagado(p_suscripcion_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
      from public.suscripciones s
      join public.historial_suscripcion h on h.suscripcion_id = s.id
     where s.id = p_suscripcion_id
       and h.a_plan_id = s.plan_id
       and h.motivo = 'Cambio de plan inmediato'
       and h.created_at > coalesce((select max(p.fecha_pago) from public.pagos_suscripcion p
                                     where p.suscripcion_id = s.id and p.fecha_pago is not null), '-infinity'::timestamptz)
  );
$$;

create or replace function public.cambiar_plan_suscripcion(
  p_suscripcion_id uuid,
  p_plan_id uuid,
  p_inmediato boolean,
  p_precio_centavos integer,
  p_actor uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  v_nombre text;
  v_inmediato boolean := p_inmediato;
begin
  select * into s from public.suscripciones where id = p_suscripcion_id for update;
  if not found then raise exception 'suscripción inexistente' using errcode = 'P0002'; end if;
  if s.estado not in ('trialing', 'authorized') then
    raise exception 'no se puede cambiar de plan en estado %', s.estado using errcode = '22023';
  end if;
  select nombre into v_nombre from public.planes where id = p_plan_id and activo;
  if v_nombre is null then raise exception 'plan inexistente o inactivo' using errcode = '22023'; end if;

  -- Volver al plan actual: anula el cambio programado.
  if p_plan_id = s.plan_id then
    if s.plan_programado_id is null then return 'sin_cambios'; end if;
    update public.suscripciones set plan_programado_id = null, precio_centavos = p_precio_centavos where id = s.id;
    insert into public.historial_suscripcion (suscripcion_id, de_estado, a_estado, de_plan_id, a_plan_id, motivo, origen, actor)
    values (s.id, s.estado, s.estado, s.plan_programado_id, s.plan_id, 'Anuló el cambio de plan programado', 'panel', p_actor);
    return 'anulado';
  end if;

  -- Bajar desde un plan que todavía no se pagó: inmediato (no se regala el resto del mes).
  if not v_inmediato and not public.plan_actual_pagado(s.id) then
    v_inmediato := true;
  end if;

  if v_inmediato then
    update public.suscripciones set plan_id = p_plan_id, plan_programado_id = null, precio_centavos = p_precio_centavos where id = s.id;
    insert into public.historial_suscripcion (suscripcion_id, de_estado, a_estado, de_plan_id, a_plan_id, motivo, origen, actor)
    values (s.id, s.estado, s.estado, s.plan_id, p_plan_id, 'Cambio de plan inmediato', 'panel', p_actor);
    insert into public.avisos_comercio (comercio_id, tipo, titulo, texto)
    values (s.comercio_id, 'cambio_plan', 'Pasaste al plan ' || v_nombre, 'El cambio ya está activo.');
    perform public.ajustar_a_plan(s.comercio_id, p_plan_id);
    return 'inmediato';
  end if;

  update public.suscripciones set plan_programado_id = p_plan_id, precio_centavos = p_precio_centavos where id = s.id;
  insert into public.historial_suscripcion (suscripcion_id, de_estado, a_estado, de_plan_id, a_plan_id, motivo, origen, actor)
  values (s.id, s.estado, s.estado, s.plan_id, p_plan_id, 'Cambio de plan programado para el fin del período', 'panel', p_actor);
  insert into public.avisos_comercio (comercio_id, tipo, titulo, texto)
  values (s.comercio_id, 'cambio_plan', 'Cambio de plan programado',
          'El ' || to_char(s.current_period_end at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY')
          || ' pasás al plan ' || v_nombre || '. Hasta ese día seguís con todo lo de tu plan actual.');
  return 'programado';
end;
$$;

revoke execute on function public.reservar_cambio_plan(uuid) from public, anon, authenticated;
revoke execute on function public.liberar_cambio_plan(uuid) from public, anon, authenticated;
revoke execute on function public.plan_actual_pagado(uuid) from public, anon, authenticated;
grant execute on function public.reservar_cambio_plan(uuid) to service_role;
grant execute on function public.liberar_cambio_plan(uuid) to service_role;
grant execute on function public.plan_actual_pagado(uuid) to service_role;
