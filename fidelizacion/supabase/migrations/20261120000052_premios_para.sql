-- =============================================================================
-- Premios por grupo: cada premio es para todos, sólo para socios del club o sólo
-- para quienes no son socios (ej. Di Vinée: un descuento para socios y otro para
-- el resto). La tarjeta muestra y canjea sólo los premios de su grupo; acá se
-- controla también en la base (canje y segmentos del panel).
-- =============================================================================

alter table public.premios
  add column if not exists para text not null default 'todos'
    check (para in ('todos', 'socios', 'no_socios'));
comment on column public.premios.para is 'Para quién es el premio: todos, socios (del club) o no_socios.';

-- Canje: el premio tiene que ser del grupo de la tarjeta (si no, premio_invalido).
create or replace function public.canjear_al_toque(
  p_tarjeta_id uuid,
  p_premio_id uuid,
  p_minutos integer default 5,
  p_mozo_confirmado uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tarjeta  public.tarjetas%rowtype;
  v_premio   public.premios%rowtype;
  v_canje_id uuid;
  v_mov_id   uuid;
  v_mozo     uuid;
begin
  select * into v_tarjeta from public.tarjetas where id = p_tarjeta_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'tarjeta_inexistente');
  end if;

  if v_tarjeta.ultimo_toque_en is null
     or v_tarjeta.ultimo_toque_en < now() - make_interval(mins => p_minutos)
     or v_tarjeta.ultimo_toque_mozo_id is null
     or not exists (select 1 from public.mozos where id = v_tarjeta.ultimo_toque_mozo_id and activo) then
    return jsonb_build_object('ok', false, 'motivo', 'sin_toque');
  end if;

  v_mozo := v_tarjeta.ultimo_toque_mozo_id;
  -- Toque con un chip de link fijo: hace falta la confirmación (PIN) de alguien del local.
  if exists (select 1 from public.chips where id = v_tarjeta.ultimo_toque_chip_id and modo = 'prueba') then
    if p_mozo_confirmado is null then
      return jsonb_build_object('ok', false, 'motivo', 'requiere_pin');
    end if;
    if not exists (select 1 from public.mozos
                    where id = p_mozo_confirmado and local_id = v_tarjeta.local_id and activo) then
      return jsonb_build_object('ok', false, 'motivo', 'pin_invalido');
    end if;
    v_mozo := p_mozo_confirmado;
  end if;

  select * into v_premio from public.premios
   where id = p_premio_id and local_id = v_tarjeta.local_id and activo;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'premio_invalido');
  end if;
  -- Premio de un grupo (socios / no socios): sólo lo canjea una tarjeta de ese grupo.
  if v_premio.para <> 'todos' and (v_premio.para = 'socios') <> (v_tarjeta.socio_desde is not null) then
    return jsonb_build_object('ok', false, 'motivo', 'premio_invalido');
  end if;

  if v_tarjeta.puntos < v_premio.puntos_necesarios then
    return jsonb_build_object('ok', false, 'motivo', 'puntos_insuficientes');
  end if;

  update public.canjes
     set estado = case when expira_en < now() then 'expirado' else 'cancelado' end, resuelto_en = now()
   where tarjeta_id = p_tarjeta_id and estado = 'pendiente';

  insert into public.canjes (tarjeta_id, local_id, premio_id, estado, mozo_id, resuelto_en)
  values (p_tarjeta_id, v_tarjeta.local_id, p_premio_id, 'confirmado', v_mozo, now())
  returning id into v_canje_id;

  insert into public.movimientos (tarjeta_id, local_id, mozo_id, chip_id, canje_id, tipo, puntos, origen)
  values (p_tarjeta_id, v_tarjeta.local_id, v_mozo, v_tarjeta.ultimo_toque_chip_id,
          v_canje_id, 'canje', -v_premio.puntos_necesarios, v_tarjeta.ultimo_toque_origen)
  returning id into v_mov_id;

  update public.tarjetas
     set puntos = puntos - v_premio.puntos_necesarios, actualizada_en = now(),
         ultimo_toque_en = null
   where id = p_tarjeta_id
  returning puntos into v_tarjeta.puntos;

  return jsonb_build_object('ok', true, 'puntos', v_tarjeta.puntos, 'movimiento_id', v_mov_id, 'premio', v_premio.nombre);
end;
$$;

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
  -- Premio de un grupo (socios / no socios): sólo lo canjea una tarjeta de ese grupo.
  if v_premio.para <> 'todos' and (v_premio.para = 'socios') <> (v_tarjeta.socio_desde is not null) then
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
  -- Premio de un grupo (socios / no socios): sólo lo canjea una tarjeta de ese grupo.
  if v_premio.para <> 'todos' and (v_premio.para = 'socios') <> (v_tarjeta.socio_desde is not null) then
    return jsonb_build_object('ok', false, 'motivo', 'premio_invalido');
  end if;
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

-- Panel (WhatsApp y avisos): el próximo premio y el alcanzado de cada cliente se
-- calculan con los premios de su grupo.
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
    select p.nombre as premio, p.puntos_necesarios as necesarios, p.para
      from public.premios p
     where p.local_id = p_local_id and p.activo
  ),
  base as (
    select t.id as tarjeta_id, c.id as id_cliente, c.nombre as nombre_cliente, c.whatsapp as wa, t.puntos as pts,
           t.no_contactar as nc, t.ultima_visita as uv, c.cumple_dia as cd, c.cumple_mes as cm,
           (t.socio_desde is not null) as soc,
           (select min(pl.necesarios) from premios_local pl
             where pl.necesarios > t.puntos and (pl.para = 'todos' or (pl.para = 'socios') = (t.socio_desde is not null))) as prox_pts,
           (select max(pl.necesarios) from premios_local pl
             where pl.necesarios <= t.puntos and (pl.para = 'todos' or (pl.para = 'socios') = (t.socio_desde is not null))) as alc_pts,
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
             and (pl.para = 'todos' or (pl.para = 'socios') = e.soc)
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
