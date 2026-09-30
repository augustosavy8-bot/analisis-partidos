-- =============================================================================
-- Fase 2: alta de la suscripción desde el panel del comercio.
--
-- El alta tiene un paso externo (crear la suscripción en Mercado Pago) en el
-- medio. Para que un doble clic o dos pestañas no creen DOS suscripciones en MP,
-- el comercio se "reserva" antes de llamar a MP y se libera después
-- (ver LEARNING.md, fase 2: "el doble clic que cobra dos veces").
-- =============================================================================

alter table public.comercios add column alta_en_curso_hasta timestamptz;

-- ¿Puede empezar un alta? Sí si no tiene una suscripción paga vigente y no hay
-- otra alta en curso. Atómico: dos llamadas simultáneas → sólo una gana.
create or replace function public.reservar_alta_suscripcion(p_comercio_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ok boolean;
begin
  update public.comercios c
     set alta_en_curso_hasta = now() + interval '2 minutes'
   where c.id = p_comercio_id
     and (c.alta_en_curso_hasta is null or c.alta_en_curso_hasta < now())
     and not exists (
       select 1 from public.suscripciones s
        where s.comercio_id = c.id and s.estado not in ('cancelled', 'cortesia')
     )
  returning true into v_ok;
  return coalesce(v_ok, false);
end;
$$;

create or replace function public.liberar_alta_suscripcion(p_comercio_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.comercios set alta_en_curso_hasta = null where id = p_comercio_id;
$$;

-- Registra la suscripción recién creada en MP. Idempotente por mp_preapproval_id:
-- si el webhook llegó antes y ya la creó, no hace nada y devuelve la existente.
-- Si el comercio estaba en cortesía, la cortesía se cierra en la misma transacción
-- (así nunca hay dos vigentes).
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

  update public.comercios set alta_en_curso_hasta = null where id = p_comercio_id;
  return v_susc;
end;
$$;

revoke execute on function public.reservar_alta_suscripcion(uuid) from public, anon, authenticated;
revoke execute on function public.liberar_alta_suscripcion(uuid) from public, anon, authenticated;
revoke execute on function public.registrar_alta_suscripcion(uuid, uuid, text, text, integer, text, timestamptz, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.reservar_alta_suscripcion(uuid) to service_role;
grant execute on function public.liberar_alta_suscripcion(uuid) to service_role;
grant execute on function public.registrar_alta_suscripcion(uuid, uuid, text, text, integer, text, timestamptz, timestamptz, uuid) to service_role;

-- -----------------------------------------------------------------------------
-- Registro propio: al confirmar el email, se crea el comercio con su primer
-- local y el usuario como dueño, todo en una transacción. Idempotente: si el
-- usuario ya es dueño de un comercio, devuelve ese (recargar no duplica nada).
-- -----------------------------------------------------------------------------
create or replace function public.completar_registro(
  p_user uuid,
  p_comercio text,
  p_rubro text,
  p_slug text,
  p_razon_social text,
  p_cuit text,
  p_condicion_fiscal text,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comercio uuid;
  v_local uuid;
begin
  -- Un registro a la vez por usuario (dos pestañas abiertas).
  perform pg_advisory_xact_lock(hashtext('registro:' || p_user::text));

  select id into v_comercio from public.comercios where owner_user_id = p_user order by created_at limit 1;
  if v_comercio is not null then
    return v_comercio;
  end if;

  v_comercio := public.crear_comercio(p_comercio, p_rubro, p_user, 'registro');
  update public.comercios
     set razon_social = nullif(btrim(coalesce(p_razon_social, '')), ''),
         cuit = nullif(p_cuit, ''),
         condicion_fiscal = nullif(p_condicion_fiscal, ''),
         email_facturacion = p_email
   where id = v_comercio;

  insert into public.locales (comercio_id, slug, nombre, rubro)
  values (v_comercio, p_slug, btrim(p_comercio), nullif(btrim(coalesce(p_rubro, '')), ''))
  returning id into v_local;

  insert into public.miembros_local (user_id, local_id, rol) values (p_user, v_local, 'dueno');
  return v_comercio;
end;
$$;
revoke execute on function public.completar_registro(uuid, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.completar_registro(uuid, text, text, text, text, text, text, text) to service_role;
