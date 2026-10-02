-- =============================================================================
-- Fase 5: cambio de plan, sin prorrateo.
--
--  - Subir (Básico → Pro): inmediato. Desde el próximo débito se cobra el precio
--    nuevo; lo que queda del mes en curso no se cobra aparte (sin prorrateo).
--  - Bajar (Pro → Básico): programado para el fin del período pago
--    (plan_programado_id). Hasta ahí sigue con Pro, que ya pagó.
--  - En prueba gratis: inmediato en los dos sentidos (todavía no pagó nada).
--
-- Al pasar a un plan sin promos, se apagan las promos y los regalos (bienvenida
-- y cumpleaños): si no, registrar_suma los seguiría aplicando.
-- =============================================================================

-- Apaga lo que el plan nuevo no incluye, en todos los locales del comercio.
create or replace function public.ajustar_a_plan(p_comercio_id uuid, p_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limites jsonb;
begin
  select limites into v_limites from public.planes where id = p_plan_id;
  if coalesce((v_limites->>'promos')::boolean, false) then return; end if;
  update public.promos set activa = false
   where activa and local_id in (select id from public.locales where comercio_id = p_comercio_id);
  update public.locales set puntos_bienvenida = 0, puntos_cumple = 0
   where comercio_id = p_comercio_id and (puntos_bienvenida > 0 or puntos_cumple > 0);
end;
$$;

-- Cambio pedido por el dueño. p_inmediato decide si se aplica ya o al fin del
-- período. Pedir el plan que ya tiene cancela un cambio programado.
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

  if p_inmediato then
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

-- Si llegó el fin del período, aplica el plan programado. Idempotente: se llama
-- desde los webhooks (antes de extender el período) y al leer la suscripción.
create or replace function public.aplicar_plan_programado(p_suscripcion_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
begin
  select * into s from public.suscripciones where id = p_suscripcion_id for update;
  if not found or s.plan_programado_id is null or s.current_period_end is null or s.current_period_end > now() then
    return false;
  end if;
  update public.suscripciones set plan_id = s.plan_programado_id, plan_programado_id = null where id = s.id;
  insert into public.historial_suscripcion (suscripcion_id, de_estado, a_estado, de_plan_id, a_plan_id, motivo, origen)
  values (s.id, s.estado, s.estado, s.plan_id, s.plan_programado_id, 'Se aplicó el cambio de plan programado', 'sistema');
  perform public.ajustar_a_plan(s.comercio_id, s.plan_programado_id);
  return true;
end;
$$;

revoke execute on function public.ajustar_a_plan(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.cambiar_plan_suscripcion(uuid, uuid, boolean, integer, uuid) from public, anon, authenticated;
revoke execute on function public.aplicar_plan_programado(uuid) from public, anon, authenticated;
grant execute on function public.ajustar_a_plan(uuid, uuid) to service_role;
grant execute on function public.cambiar_plan_suscripcion(uuid, uuid, boolean, integer, uuid) to service_role;
grant execute on function public.aplicar_plan_programado(uuid) to service_role;
