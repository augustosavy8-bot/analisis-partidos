-- =============================================================================
-- Auditoría (2/10/2026): arreglos de seguridad, cobros y planes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PIN del mozo: intento atómico.
-- Antes se contaban los fallos y después se anotaba el intento: muchos intentos
-- en paralelo leían "4 fallos" a la vez y pasaban todos. Ahora se bloquea la
-- fila del mozo, se cuenta y se anota el intento COMO FALLIDO en la misma
-- transacción; si el PIN resulta correcto, el servidor lo marca exitoso.
-- Devuelve {id: null} si ya se pasó del límite.
-- -----------------------------------------------------------------------------
create or replace function public.reservar_intento_pin(p_mozo_id uuid, p_max_fallos integer, p_ventana_min integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fallos integer;
  v_id bigint;
begin
  perform 1 from public.mozos where id = p_mozo_id for update;
  if not found then return jsonb_build_object('id', null, 'fallos', 0); end if;
  select count(*) into v_fallos from public.intentos_pin
   where mozo_id = p_mozo_id and not exitoso and created_at > now() - make_interval(mins => p_ventana_min);
  if v_fallos >= p_max_fallos then
    return jsonb_build_object('id', null, 'fallos', v_fallos);
  end if;
  insert into public.intentos_pin (mozo_id, exitoso) values (p_mozo_id, false) returning id into v_id;
  return jsonb_build_object('id', v_id, 'fallos', v_fallos + 1);
end;
$$;
revoke execute on function public.reservar_intento_pin(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.reservar_intento_pin(uuid, integer, integer) to service_role;

-- -----------------------------------------------------------------------------
-- 2. Escrituras del panel sólo desde el servidor.
-- Con permiso directo, un dueño podía usar la API de Supabase con su sesión y
-- saltearse el plan (crear promos en Básico, pasar el límite de premios, editar
-- el programa con la cuenta restringida, poner cualquier URL como logo). Ahora
-- las acciones del panel validan y escriben con service role.
-- -----------------------------------------------------------------------------
revoke insert, update, delete on public.locales from authenticated;
revoke insert, update, delete on public.premios from authenticated;
revoke insert, update, delete on public.promos  from authenticated;
revoke insert, update, delete on public.mozos   from authenticated;
-- Los grants por columna no los saca un revoke de tabla: se revocan explícitos.
revoke update (logo_url, latitud, longitud, zona_horaria, termino_personal, rubro, puntos_cumple, color_primario,
               color_secundario, puntos_bienvenida, plantillas_whatsapp, nombre, minutos_entre_puntos)
  on public.locales from authenticated;
revoke insert (local_id, nombre, pin_hash, activo) on public.mozos from authenticated;
revoke update (nombre, pin_hash, activo) on public.mozos from authenticated;
revoke insert (local_id, nombre, descripcion, puntos_necesarios, activo, orden) on public.premios from authenticated;
revoke update (nombre, descripcion, puntos_necesarios, activo, orden) on public.premios from authenticated;
revoke insert (local_id, nombre, dias, desde, hasta, puntos, activa) on public.promos from authenticated;
revoke update (nombre, dias, desde, hasta, puntos, activa) on public.promos from authenticated;

-- El próximo mensaje de un local: sólo el servidor (antes cualquier dueño podía
-- consultar el de cualquier local).
revoke execute on function public.proximo_mensaje_local(uuid) from public, anon, authenticated;
grant execute on function public.proximo_mensaje_local(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- 3. "pending" (MP no confirmó la tarjeta) tiene tope: 48 h con todo andando,
-- después sigue sumando los mismos días que tras la gracia, y al final no suma.
-- Espejo de calcularAcceso (lib/facturacion/acceso.ts).
-- -----------------------------------------------------------------------------
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
    when 'paused'     then true   -- panel restringido, pero sumar sigue
    when 'past_due'   then now() < coalesce(s.past_due_desde, now())
                                   + make_interval(days => coalesce(cfg.dias_gracia, 10) + coalesce(cfg.dias_sumar_tras_gracia, 7))
    when 'cancelled'  then true   -- sólo llega acá si el período pago sigue vigente
    else false
  end;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. El llavero incluido en el plan se regala con el PRIMER COBRO (antes se
-- regalaba al dar de alta la prueba gratis, aunque nunca pagara).
-- -----------------------------------------------------------------------------
create or replace function public.crear_regalo_chip(p_comercio_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chip uuid;
  v_pedido uuid;
begin
  perform 1 from public.comercios where id = p_comercio_id for update;
  if exists (select 1 from public.pedidos where comercio_id = p_comercio_id and regalo) then return; end if;
  select id into v_chip from public.productos where codigo = 'chip';
  if v_chip is null then return; end if;
  insert into public.pedidos (comercio_id, estado, entrega, subtotal_centavos, costo_envio_centavos, total_centavos, pagado_en, regalo)
  values (p_comercio_id, 'pagado', 'retiro', 0, 0, 0, now(), true)
  returning id into v_pedido;
  insert into public.pedido_items (pedido_id, producto_id, cantidad, precio_unitario_centavos) values (v_pedido, v_chip, 1, 0);
  update public.productos set stock = greatest(stock - 1, 0) where id = v_chip;
  insert into public.avisos_comercio (comercio_id, tipo, titulo, texto)
  values (p_comercio_id, 'chip_incluido', 'Tu plan incluye un llavero NFC',
          'Te contactamos para coordinar la entrega. Mientras tanto podés sumar puntos con el QR de tu equipo.');
end;
$$;
revoke execute on function public.crear_regalo_chip(uuid) from public, anon, authenticated;
grant execute on function public.crear_regalo_chip(uuid) to service_role;

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
  v_comercio uuid;
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

  -- Primer cobro aprobado: el llavero incluido (idempotente, uno por comercio).
  if p_estado_pago = 'approved' then
    select comercio_id into v_comercio from public.suscripciones where id = p_suscripcion_id;
    if v_comercio is not null then perform public.crear_regalo_chip(v_comercio); end if;
  end if;
  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Alta de la suscripción:
--  - la idempotencia se vuelve a mirar DESPUÉS de bloquear el comercio (el panel
--    y el webhook pueden registrar la misma a la vez);
--  - se ajusta lo que el plan nuevo no incluye (venía de cortesía Pro o de
--    otro plan y pasa a Básico: promos y regalos se apagan);
--  - el llavero de regalo ya no se crea acá (va con el primer cobro).
-- -----------------------------------------------------------------------------
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
begin
  if p_estado not in ('trialing', 'pending', 'authorized') then
    raise exception 'estado inicial inválido: %', p_estado using errcode = '22023';
  end if;

  -- Bloquea la fila del comercio: serializa altas concurrentes del mismo comercio.
  perform 1 from public.comercios where id = p_comercio_id for update;

  select id into v_susc from public.suscripciones where mp_preapproval_id = p_mp_preapproval_id;
  if v_susc is not null then
    return v_susc;
  end if;

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

  perform public.ajustar_a_plan(p_comercio_id, p_plan_id);

  update public.comercios set alta_en_curso_hasta = null where id = p_comercio_id;
  return v_susc;
end;
$$;

-- Cortesía editada a otro plan: también se ajusta lo que el plan no incluye.
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
    perform public.ajustar_a_plan(p_comercio_id, p_plan_id);
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
  perform public.ajustar_a_plan(p_comercio_id, p_plan_id);
  return 'creada';
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. Pedidos.
-- -----------------------------------------------------------------------------
alter table public.pedidos add column stock_devuelto boolean not null default false;

-- El llavero de regalo se puede despachar por envío aunque se haya creado "a retirar".
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
  if not p.regalo then
    if p_estado = 'enviado' and p.entrega <> 'envio' then return 'transicion_invalida'; end if;
    if p_estado = 'listo_retiro' and p.entrega <> 'retiro' then return 'transicion_invalida'; end if;
  end if;

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

-- Reembolso desde el admin: si el webhook del reembolso llegó antes y ya lo
-- marcó "reembolsado", igual se completa (y el stock vuelve una sola vez).
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
  if p.estado not in ('pagado', 'preparando', 'enviado', 'listo_retiro', 'entregado', 'reembolsado') then return 'no_pagado'; end if;

  update public.pagos set estado = 'refunded', reembolsado_centavos = monto_centavos where mp_payment_id = p_mp_payment_id and pedido_id = p.id;
  if p_devolver_stock and not p.stock_devuelto then
    update public.productos pr set stock = pr.stock + i.cantidad
      from public.pedido_items i where i.pedido_id = p.id and pr.id = i.producto_id;
    update public.pedidos set stock_devuelto = true where id = p.id;
  end if;
  if p.estado <> 'reembolsado' then
    update public.pedidos set estado = 'reembolsado' where id = p.id;
    insert into public.avisos_comercio (comercio_id, tipo, titulo, texto)
    values (p.comercio_id, 'pedido_reembolsado', 'Te devolvimos el pago del pedido #' || p.numero,
            'El reintegro se ve en tu medio de pago en los próximos días.');
  end if;
  return 'ok';
end;
$$;

-- Un pedido con un pago aprobado (p. ej. de monto distinto, que revisa el
-- superadmin) no "vence": el stock no se libera mientras haya plata cobrada.
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
    select id from public.pedidos pe
     where estado = 'pendiente_pago' and reserva_hasta < now()
       and not exists (select 1 from public.pagos pa where pa.pedido_id = pe.id and pa.estado = 'approved')
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

-- Reembolso que llega por webhook: el pedido pasa a reembolsado sólo si ya no
-- le queda ningún pago aprobado (reembolsar un pago duplicado no anula el pedido).
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
