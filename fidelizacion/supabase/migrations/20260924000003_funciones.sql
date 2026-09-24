-- =============================================================================
-- Operaciones atómicas de puntos. Se ejecutan sólo desde el servidor
-- (service_role) y concentran las reglas antifraude que necesitan locks.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Anti-replay de chips NTAG 424: acepta el contador sólo si es mayor al último
-- visto. Un único UPDATE condicional => seguro ante lecturas concurrentes.
-- -----------------------------------------------------------------------------
create or replace function public.consumir_contador_chip(p_chip_id uuid, p_contador integer)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with actualizado as (
    update public.chips
       set ultimo_contador = p_contador,
           ultimo_uso = now()
     where id = p_chip_id
       and activo
       and p_contador > ultimo_contador
    returning 1
  )
  select exists (select 1 from actualizado);
$$;

-- -----------------------------------------------------------------------------
-- QR de respaldo: marca un token (jti) como usado. Devuelve false si ya se usó.
-- -----------------------------------------------------------------------------
create or replace function public.consumir_qr(p_jti text, p_expira_en timestamptz)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Limpieza oportunista de tokens vencidos.
  delete from public.qr_usados where expira_en < now() - interval '1 hour';
  insert into public.qr_usados (jti, expira_en) values (p_jti, p_expira_en);
  return true;
exception when unique_violation then
  return false;
end;
$$;

-- -----------------------------------------------------------------------------
-- Suma 1 punto respetando el límite "1 punto cada N minutos" del local.
-- Devuelve jsonb:
--   {ok: true,  puntos, movimiento_id}
--   {ok: false, motivo: 'limite', proximo_en, puntos}
--   {ok: false, motivo: 'mozo_invalido' | 'tarjeta_inexistente' | 'local_inactivo'}
-- -----------------------------------------------------------------------------
create or replace function public.registrar_suma(
  p_tarjeta_id uuid,
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
  v_tarjeta   public.tarjetas%rowtype;
  v_local     public.locales%rowtype;
  v_ultima    timestamptz;
  v_proximo   timestamptz;
  v_mov_id    uuid;
begin
  -- Lock de la tarjeta: serializa toques simultáneos sobre la misma tarjeta.
  select * into v_tarjeta from public.tarjetas where id = p_tarjeta_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'tarjeta_inexistente');
  end if;

  select * into v_local from public.locales where id = v_tarjeta.local_id;
  if not v_local.activo then
    return jsonb_build_object('ok', false, 'motivo', 'local_inactivo');
  end if;

  if not exists (
    select 1 from public.mozos
    where id = p_mozo_id and local_id = v_tarjeta.local_id and activo
  ) then
    return jsonb_build_object('ok', false, 'motivo', 'mozo_invalido');
  end if;

  if v_local.minutos_entre_puntos > 0 then
    select max(created_at) into v_ultima
      from public.movimientos
     where tarjeta_id = p_tarjeta_id and tipo = 'suma';

    if v_ultima is not null then
      v_proximo := v_ultima + make_interval(mins => v_local.minutos_entre_puntos);
      if v_proximo > now() then
        return jsonb_build_object(
          'ok', false, 'motivo', 'limite',
          'proximo_en', v_proximo, 'puntos', v_tarjeta.puntos
        );
      end if;
    end if;
  end if;

  insert into public.movimientos (tarjeta_id, local_id, mozo_id, chip_id, tipo, puntos, origen)
  values (p_tarjeta_id, v_tarjeta.local_id, p_mozo_id, p_chip_id, 'suma', 1, p_origen)
  returning id into v_mov_id;

  update public.tarjetas
     set puntos = puntos + 1, actualizada_en = now()
   where id = p_tarjeta_id
  returning puntos into v_tarjeta.puntos;

  return jsonb_build_object('ok', true, 'puntos', v_tarjeta.puntos, 'movimiento_id', v_mov_id);
end;
$$;

-- -----------------------------------------------------------------------------
-- El cliente pide canjear un premio: crea un canje pendiente (vence a los 15').
-- -----------------------------------------------------------------------------
create or replace function public.solicitar_canje(p_tarjeta_id uuid, p_premio_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tarjeta  public.tarjetas%rowtype;
  v_premio   public.premios%rowtype;
  v_canje_id uuid;
begin
  select * into v_tarjeta from public.tarjetas where id = p_tarjeta_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'tarjeta_inexistente');
  end if;

  select * into v_premio from public.premios
   where id = p_premio_id and local_id = v_tarjeta.local_id and activo;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'premio_invalido');
  end if;

  if v_tarjeta.puntos < v_premio.puntos_necesarios then
    return jsonb_build_object('ok', false, 'motivo', 'puntos_insuficientes');
  end if;

  -- Vencer o reemplazar cualquier pendiente anterior.
  update public.canjes
     set estado = case when expira_en < now() then 'expirado' else 'cancelado' end,
         resuelto_en = now()
   where tarjeta_id = p_tarjeta_id and estado = 'pendiente';

  insert into public.canjes (tarjeta_id, local_id, premio_id)
  values (p_tarjeta_id, v_tarjeta.local_id, p_premio_id)
  returning id into v_canje_id;

  return jsonb_build_object('ok', true, 'canje_id', v_canje_id);
end;
$$;

-- -----------------------------------------------------------------------------
-- El mozo valida el canje pendiente (chip o QR): descuenta puntos y registra.
-- -----------------------------------------------------------------------------
create or replace function public.confirmar_canje(
  p_canje_id uuid,
  p_mozo_id  uuid,
  p_chip_id  uuid,
  p_origen   text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_canje    public.canjes%rowtype;
  v_tarjeta  public.tarjetas%rowtype;
  v_premio   public.premios%rowtype;
  v_mov_id   uuid;
begin
  select * into v_canje from public.canjes where id = p_canje_id;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'canje_inexistente');
  end if;

  -- Lock en el mismo orden que registrar_suma (tarjeta primero).
  select * into v_tarjeta from public.tarjetas where id = v_canje.tarjeta_id for update;
  select * into v_canje from public.canjes where id = p_canje_id for update;

  if v_canje.estado <> 'pendiente' then
    return jsonb_build_object('ok', false, 'motivo', 'canje_no_pendiente', 'estado', v_canje.estado);
  end if;

  if v_canje.expira_en < now() then
    update public.canjes set estado = 'expirado', resuelto_en = now() where id = p_canje_id;
    return jsonb_build_object('ok', false, 'motivo', 'canje_expirado');
  end if;

  if not exists (
    select 1 from public.mozos
    where id = p_mozo_id and local_id = v_canje.local_id and activo
  ) then
    return jsonb_build_object('ok', false, 'motivo', 'mozo_invalido');
  end if;

  select * into v_premio from public.premios where id = v_canje.premio_id;
  if v_tarjeta.puntos < v_premio.puntos_necesarios then
    return jsonb_build_object('ok', false, 'motivo', 'puntos_insuficientes');
  end if;

  update public.canjes
     set estado = 'confirmado', mozo_id = p_mozo_id, resuelto_en = now()
   where id = p_canje_id;

  insert into public.movimientos (tarjeta_id, local_id, mozo_id, chip_id, canje_id, tipo, puntos, origen)
  values (v_tarjeta.id, v_canje.local_id, p_mozo_id, p_chip_id, p_canje_id, 'canje',
          -v_premio.puntos_necesarios, p_origen)
  returning id into v_mov_id;

  update public.tarjetas
     set puntos = puntos - v_premio.puntos_necesarios, actualizada_en = now()
   where id = v_tarjeta.id
  returning puntos into v_tarjeta.puntos;

  return jsonb_build_object(
    'ok', true, 'puntos', v_tarjeta.puntos, 'movimiento_id', v_mov_id,
    'premio', v_premio.nombre
  );
end;
$$;

-- Sólo el servidor puede ejecutar estas funciones.
revoke execute on function public.consumir_contador_chip(uuid, integer) from public, anon, authenticated;
revoke execute on function public.consumir_qr(text, timestamptz) from public, anon, authenticated;
revoke execute on function public.registrar_suma(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.solicitar_canje(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.confirmar_canje(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.consumir_contador_chip(uuid, integer) to service_role;
grant execute on function public.consumir_qr(text, timestamptz) to service_role;
grant execute on function public.registrar_suma(uuid, uuid, uuid, text) to service_role;
grant execute on function public.solicitar_canje(uuid, uuid) to service_role;
grant execute on function public.confirmar_canje(uuid, uuid, uuid, text) to service_role;
