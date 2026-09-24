-- =============================================================================
-- Panel del dueño: consultas agregadas. Security definer, pero cada función
-- verifica primero que el usuario gestione el local (dueño o superadmin).
-- =============================================================================

create or replace function public.panel_metricas(p_local_id uuid, p_dias integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_desde timestamptz := now() - make_interval(days => p_dias);
  v_tz    text;
  v_res   jsonb;
begin
  if not public.puede_gestionar_local(p_local_id) then
    raise exception 'sin permiso' using errcode = '42501';
  end if;
  select zona_horaria into v_tz from public.locales where id = p_local_id;

  with sumas as (
    select tarjeta_id, mozo_id, created_at from public.movimientos
    where local_id = p_local_id and tipo = 'suma' and created_at >= v_desde
  ),
  por_tarjeta as (
    select tarjeta_id, count(*) as n from sumas group by tarjeta_id
  )
  select jsonb_build_object(
    'clientes_total', (select count(*) from public.tarjetas where local_id = p_local_id),
    'clientes_nuevos', (select count(*) from public.tarjetas where local_id = p_local_id and created_at >= v_desde),
    'visitas', (select count(*) from sumas),
    'clientes_activos', (select count(*) from por_tarjeta),
    'clientes_recurrentes', (select count(*) from por_tarjeta where n >= 2),
    'canjes', (select count(*) from public.movimientos
               where local_id = p_local_id and tipo = 'canje' and created_at >= v_desde),
    'visitas_por_dia', (
      select coalesce(jsonb_agg(jsonb_build_object('dia', d.dia, 'visitas', coalesce(c.n, 0)) order by d.dia), '[]'::jsonb)
      from generate_series(
        (now() at time zone v_tz)::date - 13, (now() at time zone v_tz)::date, interval '1 day'
      ) as d(dia)
      left join (
        select (created_at at time zone v_tz)::date as dia, count(*) as n
        from public.movimientos
        where local_id = p_local_id and tipo = 'suma' and created_at >= now() - interval '15 days'
        group by 1
      ) c on c.dia = d.dia::date
    ),
    'ranking_mozos', (
      select coalesce(jsonb_agg(r order by r.sumas desc, r.nombre), '[]'::jsonb)
      from (
        select m.id, m.nombre, m.activo,
          count(*) filter (where mv.tipo = 'suma') as sumas,
          count(*) filter (where mv.tipo = 'canje') as canjes
        from public.mozos m
        left join public.movimientos mv
          on mv.mozo_id = m.id and mv.created_at >= v_desde
        where m.local_id = p_local_id
        group by m.id
      ) r
    )
  ) into v_res;

  return v_res;
end;
$$;

create or replace function public.panel_clientes(
  p_local_id  uuid,
  p_busqueda  text default null,
  p_limite    integer default 200
)
returns table (
  cliente_id     uuid,
  nombre         text,
  whatsapp       text,
  puntos         integer,
  visitas        bigint,
  canjes         bigint,
  ultima_visita  timestamptz,
  alta           timestamptz,
  consentimiento_fecha timestamptz
)
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
  select c.id, c.nombre, c.whatsapp, t.puntos,
         count(mv.id) filter (where mv.tipo = 'suma'),
         count(mv.id) filter (where mv.tipo = 'canje'),
         max(mv.created_at) filter (where mv.tipo = 'suma'),
         t.created_at, c.consentimiento_fecha
  from public.tarjetas t
  join public.clientes c on c.id = t.cliente_id
  left join public.movimientos mv on mv.tarjeta_id = t.id
  where t.local_id = p_local_id
    and (
      v_q is null
      or c.nombre ilike '%' || v_q || '%'
      or (v_digitos is not null and length(v_digitos) >= 3 and c.whatsapp like '%' || v_digitos || '%')
    )
  group by c.id, t.id
  order by max(mv.created_at) filter (where mv.tipo = 'suma') desc nulls last, t.created_at desc
  limit greatest(1, least(p_limite, 10000));
end;
$$;

revoke execute on function public.panel_metricas(uuid, integer) from public, anon;
revoke execute on function public.panel_clientes(uuid, text, integer) from public, anon;
grant execute on function public.panel_metricas(uuid, integer) to authenticated, service_role;
grant execute on function public.panel_clientes(uuid, text, integer) to authenticated, service_role;
