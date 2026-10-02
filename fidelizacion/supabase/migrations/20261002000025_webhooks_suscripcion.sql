-- =============================================================================
-- Fase 3: webhooks de suscripción. Las decisiones (qué estado sigue) las toma
-- el servidor con funciones puras y testeadas; la base aplica el cambio de forma
-- atómica, deja el historial y el aviso, y protege las reglas que no se pueden
-- romper (una cancelada no vuelve; past_due siempre tiene fecha de inicio).
-- =============================================================================

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
begin
  select * into s from public.suscripciones where id = p_suscripcion_id for update;
  if not found then
    raise exception 'suscripción inexistente' using errcode = 'P0002';
  end if;
  -- Terminal: nada saca a una suscripción de cancelled (ni un webhook viejo).
  if s.estado = 'cancelled' and p_estado <> 'cancelled' then
    return false;
  end if;

  v_past_due_desde := case
    when p_estado = 'past_due' then coalesce(s.past_due_desde, (p_cambios->>'past_due_desde')::timestamptz, now())
    else null
  end;

  update public.suscripciones set
    estado = p_estado,
    past_due_desde = v_past_due_desde,
    current_period_end = case when p_cambios ? 'current_period_end' then (p_cambios->>'current_period_end')::timestamptz else current_period_end end,
    trial_ends_at = case when p_cambios ? 'trial_ends_at' then (p_cambios->>'trial_ends_at')::timestamptz else trial_ends_at end,
    mp_payer_email = coalesce(p_cambios->>'mp_payer_email', mp_payer_email),
    precio_centavos = coalesce((p_cambios->>'precio_centavos')::integer, precio_centavos),
    cancelada_en = case when p_estado = 'cancelled' then coalesce(cancelada_en, now()) else cancelada_en end
  where id = p_suscripcion_id;

  if s.estado is distinct from p_estado then
    insert into public.historial_suscripcion (suscripcion_id, de_estado, a_estado, de_plan_id, a_plan_id, motivo, origen)
    values (p_suscripcion_id, s.estado, p_estado, s.plan_id, s.plan_id, p_motivo, p_origen);

    -- Avisos al comercio en los cambios que le importan.
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
    end if;
  end if;
  return true;
end;
$$;

-- Cada cuota de MP, idempotente por su id. Si llega una versión vieja (menos
-- reintentos que la guardada), no pisa la nueva.
create or replace function public.registrar_cuota(
  p_suscripcion_id uuid,
  p_mp_authorized_payment_id text,
  p_mp_payment_id text,
  p_monto_centavos integer,
  p_estado text,
  p_estado_pago text,
  p_status_detail text,
  p_intento integer,
  p_fecha_debito timestamptz,
  p_fecha_pago timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.pagos_suscripcion (
    suscripcion_id, mp_authorized_payment_id, mp_payment_id, monto_centavos, estado, estado_pago,
    status_detail, intento, fecha_debito, fecha_pago
  ) values (
    p_suscripcion_id, p_mp_authorized_payment_id, nullif(p_mp_payment_id, ''), p_monto_centavos, p_estado, p_estado_pago,
    p_status_detail, coalesce(p_intento, 0), p_fecha_debito, p_fecha_pago
  )
  on conflict (mp_authorized_payment_id) do update set
    mp_payment_id = coalesce(excluded.mp_payment_id, pagos_suscripcion.mp_payment_id),
    monto_centavos = excluded.monto_centavos,
    estado = excluded.estado,
    estado_pago = excluded.estado_pago,
    status_detail = excluded.status_detail,
    intento = excluded.intento,
    fecha_debito = excluded.fecha_debito,
    fecha_pago = coalesce(excluded.fecha_pago, pagos_suscripcion.fecha_pago)
  where excluded.intento >= pagos_suscripcion.intento
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.pagos_suscripcion where mp_authorized_payment_id = p_mp_authorized_payment_id;
  end if;
  return v_id;
end;
$$;

revoke execute on function public.aplicar_cambio_suscripcion(uuid, text, jsonb, text, text) from public, anon, authenticated;
revoke execute on function public.registrar_cuota(uuid, text, text, integer, text, text, text, integer, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.aplicar_cambio_suscripcion(uuid, text, jsonb, text, text) to service_role;
grant execute on function public.registrar_cuota(uuid, text, text, integer, text, text, text, integer, timestamptz, timestamptz) to service_role;
