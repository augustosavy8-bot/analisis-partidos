-- =============================================================================
-- Panel a escala: con miles de clientes por local, el panel no recorre cada
-- movimiento del local en cada carga (eso frenaba también los toques de todos).
--  - tarjetas.ultima_visita: la última suma (la mantiene registrar_suma).
--  - panel_clientes y panel_reactivar eligen primero las tarjetas (filtros y
--    orden con columnas de la tarjeta) y cuentan el historial sólo de esas.
--  - Índices de claves foráneas que se usan al borrar clientes y canjes.
-- =============================================================================

alter table public.tarjetas add column if not exists ultima_visita timestamptz;
comment on column public.tarjetas.ultima_visita is 'Última suma (visita) de la tarjeta. La mantiene registrar_suma.';
grant select (ultima_visita) on public.tarjetas to authenticated;

update public.tarjetas t
   set ultima_visita = m.ultima
  from (select tarjeta_id, max(created_at) as ultima from public.movimientos where tipo = 'suma' group by tarjeta_id) m
 where m.tarjeta_id = t.id and t.ultima_visita is distinct from m.ultima;

create index if not exists movimientos_canje_idx on public.movimientos (canje_id) where canje_id is not null;
create index if not exists canjes_tarjeta_idx on public.canjes (tarjeta_id);
create index if not exists contactos_whatsapp_cliente_idx on public.contactos_whatsapp (cliente_id);
create index if not exists apple_passes_cliente_idx on public.apple_passes (cliente_id);
create index if not exists suscripciones_comercio_idx on public.suscripciones (comercio_id);

-- registrar_suma: igual que antes, y además guarda la última visita en la tarjeta.
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
     set puntos = puntos + v_base + v_extra, actualizada_en = now(), ultima_visita = now()
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

-- Clientes del panel: primero las tarjetas a mostrar (por última visita) y después
-- el historial de esas (visitas y canjes), no de todo el local.
create or replace function public.panel_clientes(p_local_id uuid, p_busqueda text default null, p_limite integer default 200)
returns table(cliente_id uuid, nombre text, whatsapp text, puntos integer, visitas bigint, canjes bigint, ultima_visita timestamptz, alta timestamptz, consentimiento_fecha timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q text := nullif(trim(coalesce(p_busqueda, '')), '');
  v_digitos text := nullif(regexp_replace(coalesce(p_busqueda, ''), '\D', '', 'g'), '');
begin
  if not public.puede_gestionar_local(p_local_id) then
    raise exception 'sin permiso' using errcode = '42501';
  end if;

  return query
  with elegidas as (
    select t.id as tarjeta_id, t.cliente_id as id_cliente, t.puntos as pts, t.ultima_visita as uv, t.created_at as creada
      from public.tarjetas t
      join public.clientes c on c.id = t.cliente_id
     where t.local_id = p_local_id
       and (
         v_q is null
         or c.nombre ilike '%' || v_q || '%'
         or (v_digitos is not null and length(v_digitos) >= 3 and c.whatsapp like '%' || v_digitos || '%')
       )
     order by t.ultima_visita desc nulls last, t.created_at desc, t.id
     limit greatest(1, least(p_limite, 10000))
  )
  select c.id, c.nombre, c.whatsapp, e.pts, h.n_visitas, h.n_canjes, e.uv, e.creada, c.consentimiento_fecha
    from elegidas e
    join public.clientes c on c.id = e.id_cliente
    cross join lateral (
      select count(*) filter (where m.tipo = 'suma') as n_visitas,
             count(*) filter (where m.tipo = 'canje') as n_canjes
        from public.movimientos m
       where m.tarjeta_id = e.tarjeta_id
    ) h
   order by e.uv desc nulls last, e.creada desc, e.tarjeta_id;
end;
$$;

-- Segmentos para reactivar por WhatsApp: los filtros baratos (columnas de la
-- tarjeta y del cliente) van primero; visitas y último contacto se calculan sólo
-- para los (hasta 300) que quedan.
create or replace function public.panel_reactivar(p_local_id uuid, p_segmento text, p_valor integer)
returns table (
  cliente_id       uuid,
  nombre           text,
  whatsapp         text,
  puntos           integer,
  visitas          bigint,
  ultima_visita    timestamptz,
  premio_nombre    text,
  premio_puntos    integer,
  cumple_dia       smallint,
  cumple_mes       smallint,
  ultimo_contacto  timestamptz,
  no_contactar     boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz    text;
  v_hoy   date;
  v_anio  integer;
  v_meses integer[];
begin
  if not public.puede_gestionar_local(p_local_id) then
    raise exception 'sin permiso' using errcode = '42501';
  end if;
  if p_segmento not in ('inactivos', 'cerca', 'premio', 'cumple') then
    raise exception 'segmento inválido' using errcode = '22023';
  end if;
  select zona_horaria into v_tz from public.locales where id = p_local_id;
  v_hoy := (now() at time zone v_tz)::date;
  v_anio := extract(year from v_hoy)::integer;
  -- Meses que toca la ventana de cumpleaños (para no calcular la fecha de todos).
  if p_segmento = 'cumple' then
    v_meses := array(select distinct extract(month from d)::integer
                       from generate_series(v_hoy, v_hoy + least(greatest(p_valor, 0), 366), interval '1 day') d);
  end if;

  return query
  with premios_local as materialized (
    select p.nombre as premio, p.puntos_necesarios as necesarios
      from public.premios p
     where p.local_id = p_local_id and p.activo
  ),
  base as (
    select t.id as tarjeta_id, c.id as id_cliente, c.nombre as nombre_cliente, c.whatsapp as wa, t.puntos as pts,
           t.no_contactar as nc, t.ultima_visita as uv, c.cumple_dia as cd, c.cumple_mes as cm,
           (select min(pl.necesarios) from premios_local pl where pl.necesarios > t.puntos) as prox_pts,
           (select max(pl.necesarios) from premios_local pl where pl.necesarios <= t.puntos) as alc_pts,
           case when p_segmento = 'cumple' then
             (select min(x.d) from (values
                (public.fecha_cumple(v_anio, c.cumple_mes, c.cumple_dia)),
                (public.fecha_cumple(v_anio + 1, c.cumple_mes, c.cumple_dia))) x(d)
              where x.d >= v_hoy)
           end as prox_cumple
      from public.tarjetas t
      join public.clientes c on c.id = t.cliente_id
     where t.local_id = p_local_id
       and case p_segmento
             when 'inactivos' then t.ultima_visita < now() - make_interval(days => p_valor)
             when 'cumple' then c.cumple_mes = any (v_meses)
             else true
           end
  ),
  elegidos as (
    select b.*
      from base b
     where case p_segmento
             when 'inactivos' then true
             when 'cerca'     then b.prox_pts is not null and b.prox_pts - b.pts <= p_valor
             when 'premio'    then b.alc_pts is not null
             when 'cumple'    then b.prox_cumple <= v_hoy + p_valor
           end
     order by b.nc,
              case when p_segmento = 'cumple' then b.prox_cumple end,
              case when p_segmento = 'cerca' then b.prox_pts - b.pts end,
              b.uv desc nulls last,
              b.tarjeta_id
     limit 300
  )
  select e.id_cliente, e.nombre_cliente, e.wa, e.pts,
         (select count(*) from public.movimientos m where m.tarjeta_id = e.tarjeta_id and m.tipo = 'suma'),
         e.uv,
         (select pl.premio from premios_local pl
           where pl.necesarios = case when p_segmento = 'premio' then e.alc_pts else e.prox_pts end
           order by pl.premio limit 1),
         case when p_segmento = 'premio' then e.alc_pts else e.prox_pts end,
         e.cd, e.cm,
         (select max(k.created_at) from public.contactos_whatsapp k where k.local_id = p_local_id and k.cliente_id = e.id_cliente),
         e.nc
    from elegidos e
   order by e.nc,
            case when p_segmento = 'cumple' then e.prox_cumple end,
            case when p_segmento = 'cerca' then e.prox_pts - e.pts end,
            e.uv desc nulls last,
            e.tarjeta_id;
end;
$$;

revoke execute on function public.panel_reactivar(uuid, text, integer) from public, anon;
grant execute on function public.panel_reactivar(uuid, text, integer) to authenticated, service_role;
