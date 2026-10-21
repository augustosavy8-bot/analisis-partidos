-- Dos huecos de facturación:
--
-- 1. Sin ningún cobro aprobado no hay gracia. Una tarjeta que se valida pero no
--    tiene fondos pasaba a past_due con los días de gracia (todo andando), y
--    cancelando y volviendo a suscribirse la gracia empezaba de nuevo. Ahora, si
--    el comercio nunca tuvo un cobro aprobado, past_due va directo a restringido
--    (sumar sigue unos días) contando desde su PRIMER impago, en cualquier
--    suscripción: cancelar y volver a suscribirse no lo reinicia.
--    (Misma regla en src/lib/facturacion/acceso.ts.)
--
-- 2. Bajada de plan programada: se aplicaba sólo si current_period_end ya había
--    pasado. Si el cobro del mes llegaba unas horas antes de esa hora, el
--    período se extendía sin aplicarla y el comercio seguía con el plan caro
--    pagando el barato. Con un cobro aprobado empieza el período nuevo: se
--    aplica siempre (aplicar_plan_programado_por_cobro).

-- Primer impago del comercio si nunca tuvo un cobro aprobado (null si alguna vez pagó).
create or replace function public.impago_sin_cobros(p_comercio_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (
      select 1 from public.pagos_suscripcion p
        join public.suscripciones s on s.id = p.suscripcion_id
       where s.comercio_id = p_comercio_id
         and (p.estado_pago = 'approved' or p.fecha_pago is not null)
    ) then null
    else (
      select min(coalesce(h.created_at, s.past_due_desde))
        from public.suscripciones s
        left join public.historial_suscripcion h on h.suscripcion_id = s.id and h.a_estado = 'past_due'
       where s.comercio_id = p_comercio_id
         and (h.id is not null or s.past_due_desde is not null)
    )
  end;
$$;

create or replace function public.suma_habilitada_local(p_local_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_comercio uuid;
  s record;
  cfg record;
  v_primer_impago timestamptz;
begin
  select comercio_id into v_comercio from public.locales where id = p_local_id;
  if v_comercio is null then return false; end if;

  select estado, cortesia_hasta, current_period_end, past_due_desde, created_at into s
    from public.suscripciones
   where comercio_id = v_comercio
     and (estado <> 'cancelled' or current_period_end > now())
   order by (estado = 'cancelled'), created_at desc
   limit 1;
  if not found then return false; end if;

  select dias_gracia, dias_sumar_tras_gracia into cfg from public.config_facturacion limit 1;

  if s.estado = 'past_due' then
    v_primer_impago := public.impago_sin_cobros(v_comercio);
    if v_primer_impago is not null then
      -- Nunca pagó: sin gracia, y desde el primer impago.
      return now() < v_primer_impago + make_interval(days => coalesce(cfg.dias_sumar_tras_gracia, 7));
    end if;
  end if;

  return case s.estado
    when 'cortesia'   then s.cortesia_hasta is null or s.cortesia_hasta > now()
    when 'trialing'   then true
    when 'authorized' then true
    when 'pending'    then now() < s.created_at + interval '48 hours'
                                   + make_interval(days => coalesce(cfg.dias_sumar_tras_gracia, 7))
    when 'paused'     then s.current_period_end is null
                           or now() < s.current_period_end + make_interval(days => coalesce(cfg.dias_sumar_tras_gracia, 7))
    when 'past_due'   then now() < coalesce(s.past_due_desde, now())
                                   + make_interval(days => coalesce(cfg.dias_gracia, 10) + coalesce(cfg.dias_sumar_tras_gracia, 7))
    when 'cancelled'  then true
    else false
  end;
end;
$$;

-- Cobro aprobado = empieza el período nuevo: la bajada programada se aplica sin mirar la hora.
create or replace function public.aplicar_plan_programado_por_cobro(p_suscripcion_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
begin
  select * into s from public.suscripciones where id = p_suscripcion_id for update;
  if not found or s.plan_programado_id is null then
    return false;
  end if;
  update public.suscripciones set plan_id = s.plan_programado_id, plan_programado_id = null where id = s.id;
  insert into public.historial_suscripcion (suscripcion_id, de_estado, a_estado, de_plan_id, a_plan_id, motivo, origen)
  values (s.id, s.estado, s.estado, s.plan_id, s.plan_programado_id, 'Se aplicó el cambio de plan programado (cobro del período nuevo)', 'sistema');
  perform public.ajustar_a_plan(s.comercio_id, s.plan_programado_id);
  return true;
end;
$$;

revoke execute on function public.impago_sin_cobros(uuid) from public, anon, authenticated;
revoke execute on function public.aplicar_plan_programado_por_cobro(uuid) from public, anon, authenticated;
grant execute on function public.impago_sin_cobros(uuid) to service_role;
grant execute on function public.aplicar_plan_programado_por_cobro(uuid) to service_role;
