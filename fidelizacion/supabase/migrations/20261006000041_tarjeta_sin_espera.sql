-- Tarjetas sin espera entre puntos (demos de venta): pueden sumar cuando quieran,
-- sin la regla de minutos del local. Sólo se marca a mano (service_role).
alter table public.tarjetas add column if not exists sin_espera boolean not null default false;
comment on column public.tarjetas.sin_espera is 'Si es true, ignora minutos_entre_puntos del local (tarjetas de demostración).';

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
  v_cliente   public.clientes%rowtype;
  v_ultima    timestamptz;
  v_proximo   timestamptz;
  v_mov_id    uuid;
  v_ahora     timestamp;
  v_hoy       date;
  v_promo     record;
  v_base      integer := 1;
  v_primera   boolean;
  v_regalos   jsonb := '[]'::jsonb;
  v_extra     integer := 0;
  v_anio      integer;
  v_cumple    date;
  v_hash      text;
  v_cobrado   public.beneficios_cobrados%rowtype;
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

  -- Lo que ya cobró este número en este local, aunque haya borrado la cuenta y vuelto.
  select encode(sha256(convert_to(c.whatsapp, 'UTF8')), 'hex') into v_hash
    from public.clientes c where c.id = v_tarjeta.cliente_id;
  select * into v_cobrado from public.beneficios_cobrados where local_id = v_tarjeta.local_id and whatsapp_hash = v_hash;

  if v_local.minutos_entre_puntos > 0 and not v_tarjeta.sin_espera then
    select max(created_at) into v_ultima
      from public.movimientos
     where tarjeta_id = p_tarjeta_id and tipo = 'suma';
    v_ultima := greatest(v_ultima, v_cobrado.ultima_suma_en);

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

  v_ahora := now() at time zone v_local.zona_horaria;
  v_hoy := v_ahora::date;
  v_primera := not exists (select 1 from public.movimientos where tarjeta_id = p_tarjeta_id);

  -- Promo vigente (si hay varias, la que más da).
  select nombre, puntos into v_promo
    from public.promos
   where local_id = v_local.id and activa
     and extract(dow from v_ahora)::smallint = any (dias)
     and v_ahora::time >= desde and v_ahora::time < hasta
   order by puntos desc, created_at
   limit 1;
  if found then
    v_base := v_promo.puntos;
  end if;

  insert into public.movimientos (tarjeta_id, local_id, mozo_id, chip_id, tipo, puntos, origen, motivo, detalle)
  values (p_tarjeta_id, v_tarjeta.local_id, p_mozo_id, p_chip_id, 'suma', v_base, p_origen,
          case when v_base > 1 then 'promo' end, case when v_base > 1 then v_promo.nombre end)
  returning id into v_mov_id;

  -- Bienvenida: sólo en el primer movimiento de la tarjeta.
  if v_primera and v_local.puntos_bienvenida > 0 and v_cobrado.bienvenida_en is null then
    insert into public.movimientos (tarjeta_id, local_id, mozo_id, chip_id, tipo, puntos, origen, motivo)
    values (p_tarjeta_id, v_tarjeta.local_id, p_mozo_id, p_chip_id, 'regalo', v_local.puntos_bienvenida, p_origen, 'bienvenida');
    v_extra := v_extra + v_local.puntos_bienvenida;
    v_regalos := v_regalos || jsonb_build_object('motivo', 'bienvenida', 'puntos', v_local.puntos_bienvenida);
    v_cobrado.bienvenida_en := now();
  end if;

  -- Cumple: primera visita entre el día del cumple y los 6 días siguientes.
  -- Anti-abuso: el cumple tiene que estar cargado desde hace al menos 30 días.
  if v_local.puntos_cumple > 0 then
    select * into v_cliente from public.clientes where id = v_tarjeta.cliente_id;
    if v_cliente.cumple_mes is not null and v_cliente.cumple_cargado_en <= now() - interval '30 days' then
      foreach v_anio in array array[extract(year from v_hoy)::integer, extract(year from v_hoy)::integer - 1] loop
        v_cumple := public.fecha_cumple(v_anio, v_cliente.cumple_mes, v_cliente.cumple_dia);
        if v_hoy between v_cumple and v_cumple + 6
           and v_tarjeta.cumple_regalado_anio is distinct from v_anio
           and v_cobrado.cumple_anio is distinct from v_anio then
          insert into public.movimientos (tarjeta_id, local_id, mozo_id, chip_id, tipo, puntos, origen, motivo)
          values (p_tarjeta_id, v_tarjeta.local_id, p_mozo_id, p_chip_id, 'regalo', v_local.puntos_cumple, p_origen, 'cumple');
          update public.tarjetas set cumple_regalado_anio = v_anio where id = p_tarjeta_id;
          v_cobrado.cumple_anio := v_anio;
          v_extra := v_extra + v_local.puntos_cumple;
          v_regalos := v_regalos || jsonb_build_object('motivo', 'cumple', 'puntos', v_local.puntos_cumple);
          exit;
        end if;
      end loop;
    end if;
  end if;

  if v_hash is not null then
    insert into public.beneficios_cobrados (local_id, whatsapp_hash, bienvenida_en, cumple_anio, ultima_suma_en)
    values (v_tarjeta.local_id, v_hash, v_cobrado.bienvenida_en, v_cobrado.cumple_anio, now())
    on conflict (local_id, whatsapp_hash) do update
      set bienvenida_en = coalesce(public.beneficios_cobrados.bienvenida_en, excluded.bienvenida_en),
          cumple_anio = coalesce(excluded.cumple_anio, public.beneficios_cobrados.cumple_anio),
          ultima_suma_en = excluded.ultima_suma_en;
  end if;

  update public.tarjetas
     set puntos = puntos + v_base + v_extra, actualizada_en = now()
   where id = p_tarjeta_id
  returning puntos into v_tarjeta.puntos;

  return jsonb_build_object(
    'ok', true, 'puntos', v_tarjeta.puntos, 'movimiento_id', v_mov_id,
    'sumados', v_base, 'promo', case when v_base > 1 then v_promo.nombre end,
    'regalos', v_regalos
  );
end;
$$;

revoke execute on function public.registrar_suma(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.registrar_suma(uuid, uuid, uuid, text) to service_role;
