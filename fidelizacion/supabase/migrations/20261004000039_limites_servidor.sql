-- =============================================================================
-- Límites del plan y pausa, del lado de la base.
--
-- 1. Pausa: antes, una suscripción pausada seguía sumando puntos para siempre
--    (pagar un mes, pausar y usar gratis). Ahora, como con un pago vencido:
--    después del período pago quedan `dias_sumar_tras_gracia` días y se corta.
-- 2. `registrar_mensaje_local` y `panel_metricas` se podían llamar directo por la
--    API con la sesión del dueño, salteando el plan (novedades en Básico,
--    estadísticas avanzadas, cuenta restringida). Ahora sólo las llama el
--    servidor, después de validar el plan, a través de wrappers que conservan el
--    control de permisos de la función original (auth.uid() = el usuario).
-- 3. Restos: el dueño ya no puede editar chips ni leer el token de Wallet de las
--    tarjetas (permite registrar/borrar dispositivos de los pases de sus clientes).
-- =============================================================================

-- 1. Pausa con fin.
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

-- 2. Sólo el servidor (que ya validó plan y estado de la cuenta).
create or replace function public.registrar_mensaje_local_de(p_user_id uuid, p_local_id uuid, p_titulo text, p_texto text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id)::text, true);
  return public.registrar_mensaje_local(p_local_id, p_titulo, p_texto);
end;
$$;

create or replace function public.panel_metricas_de(p_user_id uuid, p_local_id uuid, p_dias integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id)::text, true);
  return public.panel_metricas(p_local_id, least(greatest(p_dias, 1), 365));
end;
$$;

revoke execute on function public.registrar_mensaje_local(uuid, text, text) from authenticated;
revoke execute on function public.panel_metricas(uuid, integer) from authenticated;
revoke execute on function public.registrar_mensaje_local_de(uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.panel_metricas_de(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.registrar_mensaje_local_de(uuid, uuid, text, text) to service_role;
grant execute on function public.panel_metricas_de(uuid, uuid, integer) to service_role;

-- 3. Restos de grants.
revoke update (mozo_id, etiqueta) on public.chips from authenticated;
revoke select on public.tarjetas from authenticated;
grant select (id, cliente_id, local_id, puntos, serial, created_at, actualizada_en, cumple_regalado_anio, no_contactar,
              ultimo_toque_en, ultimo_toque_mozo_id, ultimo_toque_chip_id, ultimo_toque_origen)
  on public.tarjetas to authenticated;
