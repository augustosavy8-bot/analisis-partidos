-- =============================================================================
-- Puntos extra y cumpleaños:
--   * Puntos de bienvenida (en la primera visita).
--   * Regalo de cumpleaños (primera visita en la semana del cumple).
--   * Promos de puntos dobles/triples por día y horario.
-- Los regalos quedan en movimientos con tipo 'regalo' y su motivo.
-- =============================================================================

alter table public.locales
  add column puntos_bienvenida integer not null default 0 check (puntos_bienvenida between 0 and 50),
  add column puntos_cumple     integer not null default 0 check (puntos_cumple between 0 and 50);
grant update (puntos_bienvenida, puntos_cumple) on public.locales to authenticated;

-- Cumpleaños sin año (no hace falta y es un dato menos).
alter table public.clientes
  add column cumple_dia smallint,
  add column cumple_mes smallint check (cumple_mes between 1 and 12),
  add column cumple_cargado_en timestamptz,
  add constraint clientes_cumple_valido check (
    (cumple_dia is null and cumple_mes is null)
    or (cumple_dia is not null and cumple_mes is not null and cumple_dia >= 1 and cumple_dia <=
        case when cumple_mes = 2 then 29 when cumple_mes in (4, 6, 9, 11) then 30 else 31 end)
  );

-- Año del último regalo de cumple entregado en esta tarjeta (uno por año).
alter table public.tarjetas
  add column cumple_regalado_anio smallint;

-- Movimientos: nuevo tipo 'regalo' y motivo/detalle.
alter table public.movimientos drop constraint movimientos_tipo_check;
alter table public.movimientos drop constraint movimientos_signo;
alter table public.movimientos
  add constraint movimientos_tipo_check check (tipo in ('suma', 'canje', 'regalo')),
  add constraint movimientos_signo check (
    (tipo in ('suma', 'regalo') and puntos > 0) or (tipo = 'canje' and puntos < 0)
  ),
  add column motivo text check (motivo in ('promo', 'bienvenida', 'cumple')),
  add column detalle text check (length(detalle) <= 60),
  add constraint movimientos_regalo_motivo check (tipo <> 'regalo' or motivo in ('bienvenida', 'cumple'));

-- -----------------------------------------------------------------------------
-- Promos por día y horario (hora local del local). dias: 0 = domingo … 6 = sábado.
-- -----------------------------------------------------------------------------
create table public.promos (
  id         uuid primary key default gen_random_uuid(),
  local_id   uuid not null references public.locales (id) on delete cascade,
  nombre     text not null check (length(trim(nombre)) between 1 and 40),
  dias       smallint[] not null check (cardinality(dias) between 1 and 7 and dias <@ array[0,1,2,3,4,5,6]::smallint[]),
  desde      time not null,
  hasta      time not null,
  puntos     smallint not null check (puntos between 2 and 5),
  activa     boolean not null default true,
  created_at timestamptz not null default now(),
  constraint promos_horario check (hasta > desde)
);
create index promos_local_idx on public.promos (local_id);

alter table public.promos enable row level security;
revoke all on public.promos from anon, authenticated;
grant all on public.promos to service_role;
grant select, delete on public.promos to authenticated;
grant insert (local_id, nombre, dias, desde, hasta, puntos, activa) on public.promos to authenticated;
grant update (nombre, dias, desde, hasta, puntos, activa) on public.promos to authenticated;
create policy promos_select on public.promos for select to authenticated
  using (public.puede_gestionar_local(local_id));
create policy promos_insert on public.promos for insert to authenticated
  with check (public.puede_gestionar_local(local_id));
create policy promos_update on public.promos for update to authenticated
  using (public.puede_gestionar_local(local_id)) with check (public.puede_gestionar_local(local_id));
create policy promos_delete on public.promos for delete to authenticated
  using (public.puede_gestionar_local(local_id));

-- -----------------------------------------------------------------------------
-- Fecha del cumple en un año dado (29/2 cae el 28/2 en años no bisiestos).
-- -----------------------------------------------------------------------------
create or replace function public.fecha_cumple(p_anio integer, p_mes integer, p_dia integer)
returns date
language sql
immutable
set search_path = ''
as $$
  select make_date(p_anio, p_mes,
    least(p_dia, extract(day from (make_date(p_anio, p_mes, 1) + interval '1 month - 1 day'))::integer));
$$;

-- -----------------------------------------------------------------------------
-- registrar_suma con promos y regalos. Misma firma; devuelve además:
--   sumados (puntos del toque), promo (nombre o null),
--   regalos [{motivo, puntos}].
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
  if v_primera and v_local.puntos_bienvenida > 0 then
    insert into public.movimientos (tarjeta_id, local_id, mozo_id, chip_id, tipo, puntos, origen, motivo)
    values (p_tarjeta_id, v_tarjeta.local_id, p_mozo_id, p_chip_id, 'regalo', v_local.puntos_bienvenida, p_origen, 'bienvenida');
    v_extra := v_extra + v_local.puntos_bienvenida;
    v_regalos := v_regalos || jsonb_build_object('motivo', 'bienvenida', 'puntos', v_local.puntos_bienvenida);
  end if;

  -- Cumple: primera visita entre el día del cumple y los 6 días siguientes.
  -- Anti-abuso: el cumple tiene que estar cargado desde hace al menos 30 días.
  if v_local.puntos_cumple > 0 then
    select * into v_cliente from public.clientes where id = v_tarjeta.cliente_id;
    if v_cliente.cumple_mes is not null and v_cliente.cumple_cargado_en <= now() - interval '30 days' then
      foreach v_anio in array array[extract(year from v_hoy)::integer, extract(year from v_hoy)::integer - 1] loop
        v_cumple := public.fecha_cumple(v_anio, v_cliente.cumple_mes, v_cliente.cumple_dia);
        if v_hoy between v_cumple and v_cumple + 6
           and v_tarjeta.cumple_regalado_anio is distinct from v_anio then
          insert into public.movimientos (tarjeta_id, local_id, mozo_id, chip_id, tipo, puntos, origen, motivo)
          values (p_tarjeta_id, v_tarjeta.local_id, p_mozo_id, p_chip_id, 'regalo', v_local.puntos_cumple, p_origen, 'cumple');
          update public.tarjetas set cumple_regalado_anio = v_anio where id = p_tarjeta_id;
          v_extra := v_extra + v_local.puntos_cumple;
          v_regalos := v_regalos || jsonb_build_object('motivo', 'cumple', 'puntos', v_local.puntos_cumple);
          exit;
        end if;
      end loop;
    end if;
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
