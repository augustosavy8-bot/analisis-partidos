-- =============================================================================
-- Fase 4: cobros fallidos, morosidad, pausa y cancelación.
--
-- El nivel de acceso del comercio se calcula en TypeScript (lib/facturacion/
-- acceso.ts) para el panel. Pero el toque (sumar puntos) es una sola llamada a
-- la base por velocidad, así que la regla "¿este local puede sumar?" vive
-- también acá, en suma_habilitada_local. Las dos versiones tienen tests con los
-- mismos casos: si se cambia una, se cambia la otra.
--
-- Regla de oro: el CANJE de puntos ya ganados nunca se bloquea.
-- =============================================================================

-- ¿El comercio dueño de este local puede sumar puntos ahora?
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

  -- La vigente (no cancelada) manda; si no hay, una cancelada con período pago por delante.
  select estado, cortesia_hasta, current_period_end, past_due_desde into s
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
    when 'pending'    then true
    when 'paused'     then true   -- panel restringido, pero sumar sigue
    when 'past_due'   then now() < coalesce(s.past_due_desde, now())
                                   + make_interval(days => coalesce(cfg.dias_gracia, 10) + coalesce(cfg.dias_sumar_tras_gracia, 7))
    when 'cancelled'  then true   -- sólo llega acá si el período pago sigue vigente
    else false
  end;
end;
$$;
revoke execute on function public.suma_habilitada_local(uuid) from public, anon, authenticated;
grant execute on function public.suma_habilitada_local(uuid) to service_role;

-- El toque: si el programa está pausado, NO suma, pero:
--  - un canje pendiente se confirma igual (va antes que el chequeo);
--  - el toque se registra igual, para que el cliente pueda "canjear al toque".
create or replace function public.aplicar_toque(
  p_cliente_id uuid,
  p_local_id   uuid,
  p_mozo_id    uuid,
  p_chip_id    uuid,
  p_origen     text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tarjeta_id uuid;
  v_serial     text;
  v_canje_id   uuid;
  v_r          jsonb;
begin
  v_tarjeta_id := public.asegurar_tarjeta(p_cliente_id, p_local_id);
  select serial into v_serial from public.tarjetas where id = v_tarjeta_id;

  select id into v_canje_id from public.canjes
   where tarjeta_id = v_tarjeta_id and estado = 'pendiente' and expira_en > now();

  if v_canje_id is not null then
    v_r := public.confirmar_canje(v_canje_id, p_mozo_id, p_chip_id, p_origen);
    if (v_r->>'ok')::boolean then
      return jsonb_build_object('tipo', 'canje', 'movimiento_id', v_r->'movimiento_id', 'serial', v_serial);
    end if;
    return jsonb_build_object('tipo', 'error', 'motivo', v_r->>'motivo');
  end if;

  if not public.suma_habilitada_local(p_local_id) then
    perform public.marcar_toque(v_tarjeta_id, p_mozo_id, p_chip_id, p_origen);
    return jsonb_build_object('tipo', 'error', 'motivo', 'programa_pausado');
  end if;

  v_r := public.registrar_suma(v_tarjeta_id, p_mozo_id, p_chip_id, p_origen);
  if (v_r->>'ok')::boolean or v_r->>'motivo' = 'limite' then
    perform public.marcar_toque(v_tarjeta_id, p_mozo_id, p_chip_id, p_origen);
  end if;
  if (v_r->>'ok')::boolean then
    return jsonb_build_object('tipo', 'suma', 'movimiento_id', v_r->'movimiento_id', 'serial', v_serial);
  end if;
  if v_r->>'motivo' = 'limite' then
    return jsonb_build_object('tipo', 'limite', 'proximo_en', v_r->'proximo_en', 'serial', v_serial);
  end if;
  return jsonb_build_object('tipo', 'error', 'motivo', v_r->>'motivo');
end;
$$;
revoke execute on function public.aplicar_toque(uuid, uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.aplicar_toque(uuid, uuid, uuid, uuid, text) to service_role;

-- Cancelación: si se cancela estando impaga o pausada, NO conserva acceso por un
-- "período pago" que no se pagó (MP puede informar un próximo cobro futuro).
-- Si se cancela estando al día, conserva el acceso hasta current_period_end.
create or replace function public.aplicar_cambio_suscripcion(
  p_suscripcion_id uuid,
  p_estado text,
  p_cambios jsonb,
  p_motivo text,
  p_origen text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  v_past_due_desde timestamptz;
  v_fin timestamptz;
begin
  select * into s from public.suscripciones where id = p_suscripcion_id for update;
  if not found then
    raise exception 'suscripción inexistente' using errcode = 'P0002';
  end if;
  if s.estado = 'cancelled' and p_estado <> 'cancelled' then
    return false;
  end if;

  v_past_due_desde := case
    when p_estado = 'past_due' then coalesce(s.past_due_desde, (p_cambios->>'past_due_desde')::timestamptz, now())
    else null
  end;

  v_fin := case when p_cambios ? 'current_period_end' then (p_cambios->>'current_period_end')::timestamptz else s.current_period_end end;
  if p_estado = 'cancelled' and s.estado <> 'cancelled' then
    if s.estado in ('past_due', 'paused', 'pending', 'cortesia') then
      v_fin := least(coalesce(s.current_period_end, now()), now());
    else
      v_fin := s.current_period_end;  -- al día: conserva lo que ya pagó (o lo que le queda de prueba)
    end if;
  elsif p_estado = 'cancelled' then
    v_fin := s.current_period_end;    -- ya cancelada: un webhook repetido no mueve la fecha
  end if;

  update public.suscripciones set
    estado = p_estado,
    past_due_desde = v_past_due_desde,
    current_period_end = v_fin,
    trial_ends_at = case when p_cambios ? 'trial_ends_at' then (p_cambios->>'trial_ends_at')::timestamptz else trial_ends_at end,
    mp_payer_email = coalesce(p_cambios->>'mp_payer_email', mp_payer_email),
    precio_centavos = coalesce((p_cambios->>'precio_centavos')::integer, precio_centavos),
    cancel_at_period_end = case when p_estado = 'cancelled' then false
                                when p_cambios ? 'cancel_at_period_end' then (p_cambios->>'cancel_at_period_end')::boolean
                                else cancel_at_period_end end,
    cancelada_en = case when p_estado = 'cancelled' then coalesce(cancelada_en, now()) else cancelada_en end
  where id = p_suscripcion_id;

  if s.estado is distinct from p_estado then
    insert into public.historial_suscripcion (suscripcion_id, de_estado, a_estado, de_plan_id, a_plan_id, motivo, origen)
    values (p_suscripcion_id, s.estado, p_estado, s.plan_id, s.plan_id, p_motivo, p_origen);

    if p_estado = 'past_due' then
      insert into public.avisos_comercio (comercio_id, tipo, titulo, texto)
      values (s.comercio_id, 'cobro_fallido', 'No pudimos cobrar tu suscripción',
              'Mercado Pago va a reintentar el cobro en los próximos días. Revisá que tu tarjeta tenga fondos o cambiala desde Facturación.');
    elsif p_estado = 'authorized' and s.estado = 'past_due' then
      insert into public.avisos_comercio (comercio_id, tipo, titulo, texto)
      values (s.comercio_id, 'cobro_recuperado', 'Recibimos tu pago', 'Tu suscripción está al día. ¡Gracias!');
    elsif p_estado = 'authorized' and s.estado = 'trialing' then
      insert into public.avisos_comercio (comercio_id, tipo, titulo, texto)
      values (s.comercio_id, 'primer_cobro', 'Terminó tu prueba gratis', 'Se cobró la primera cuota y tu suscripción quedó activa.');
    elsif p_estado = 'cancelled' then
      insert into public.avisos_comercio (comercio_id, tipo, titulo, texto)
      values (s.comercio_id, 'suscripcion_cancelada', 'Tu suscripción se canceló',
              'Ya no se te va a cobrar. Tus clientes conservan sus puntos. Podés volver a activarla cuando quieras desde Facturación.');
    elsif p_estado = 'paused' then
      insert into public.avisos_comercio (comercio_id, tipo, titulo, texto)
      values (s.comercio_id, 'suscripcion_pausada', 'Tu suscripción está pausada', 'No se te cobra mientras esté pausada.');
    elsif p_estado in ('authorized', 'trialing') and s.estado = 'paused' then
      insert into public.avisos_comercio (comercio_id, tipo, titulo, texto)
      values (s.comercio_id, 'suscripcion_reactivada', 'Reactivaste tu suscripción', 'Todo vuelve a funcionar normalmente.');
    end if;
  end if;
  return true;
end;
$$;
revoke execute on function public.aplicar_cambio_suscripcion(uuid, text, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.aplicar_cambio_suscripcion(uuid, text, jsonb, text, text) to service_role;
