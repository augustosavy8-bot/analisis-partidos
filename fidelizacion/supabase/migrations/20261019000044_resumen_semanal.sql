-- Resumen semanal por mail a los dueños (los lunes, desde el cron diario).
--
-- 1. miembros_local.resumen_semanal: cada dueño puede dejar de recibirlo (Ajustes o
--    el link del mail). Es por local: un dueño con dos locales elige en cada uno.
-- 2. resumenes_semanales: qué semana ya se mandó a cada local (no se repite si el
--    cron corre dos veces).
-- 3. resumen_semanal(local, hasta): los números de la semana que termina en `hasta`
--    y de la anterior. 4. destinatarios_resumen(): a quién mandarlo.
-- Todo sólo para el servidor (service_role).

alter table public.miembros_local add column if not exists resumen_semanal boolean not null default true;

create table if not exists public.resumenes_semanales (
  local_id uuid not null references public.locales(id) on delete cascade,
  semana date not null,
  enviado_en timestamptz not null default now(),
  destinatarios integer not null default 0,
  primary key (local_id, semana)
);
alter table public.resumenes_semanales enable row level security;
revoke all on public.resumenes_semanales from anon, authenticated;

create or replace function public.resumen_semanal(p_local_id uuid, p_hasta timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_desde timestamptz := p_hasta - interval '7 days';
  v_antes timestamptz := p_hasta - interval '14 days';
  v_tz text;
  v_hoy date;
begin
  select zona_horaria into v_tz from public.locales where id = p_local_id;
  if v_tz is null then
    return null;
  end if;
  v_hoy := (p_hasta at time zone v_tz)::date;

  return jsonb_build_object(
    'visitas', (select count(*) from public.movimientos
                where local_id = p_local_id and tipo = 'suma' and created_at >= v_desde and created_at < p_hasta),
    'visitas_antes', (select count(*) from public.movimientos
                      where local_id = p_local_id and tipo = 'suma' and created_at >= v_antes and created_at < v_desde),
    'nuevos', (select count(*) from public.tarjetas
               where local_id = p_local_id and created_at >= v_desde and created_at < p_hasta),
    'nuevos_antes', (select count(*) from public.tarjetas
                     where local_id = p_local_id and created_at >= v_antes and created_at < v_desde),
    'canjes', (select count(*) from public.movimientos
               where local_id = p_local_id and tipo = 'canje' and created_at >= v_desde and created_at < p_hasta),
    'canjes_antes', (select count(*) from public.movimientos
                     where local_id = p_local_id and tipo = 'canje' and created_at >= v_antes and created_at < v_desde),
    'clientes_total', (select count(*) from public.tarjetas where local_id = p_local_id and created_at < p_hasta),
    -- Los que vinieron alguna vez y hace 30 días o más que no vuelven (y se los puede contactar).
    'inactivos', (select count(*) from public.tarjetas
                  where local_id = p_local_id and not no_contactar
                    and coalesce(ultima_visita, created_at) < p_hasta - interval '30 days'),
    'mozo_top', (
      select jsonb_build_object('nombre', m.nombre, 'sumas', count(*))
      from public.movimientos mv join public.mozos m on m.id = mv.mozo_id
      where mv.local_id = p_local_id and mv.tipo = 'suma' and mv.created_at >= v_desde and mv.created_at < p_hasta
      group by m.id, m.nombre
      order by count(*) desc, m.nombre
      limit 1
    ),
    -- Cumpleaños de los próximos 7 días (desde el día del resumen), en la zona del local.
    'cumples', (
      select coalesce(jsonb_agg(jsonb_build_object('nombre', x.nombre, 'dia', x.dia, 'mes', x.mes) order by x.fecha, x.nombre), '[]'::jsonb)
      from (
        select c.nombre, c.cumple_dia as dia, c.cumple_mes as mes, d.fecha
        from public.tarjetas t
        join public.clientes c on c.id = t.cliente_id
        join (select (v_hoy + i) as fecha from generate_series(0, 6) i) d
          on extract(day from d.fecha) = c.cumple_dia and extract(month from d.fecha) = c.cumple_mes
        where t.local_id = p_local_id
        order by d.fecha, c.nombre
        limit 10
      ) x
    )
  );
end;
$$;

create or replace function public.destinatarios_resumen()
returns table (local_id uuid, local_nombre text, local_slug text, user_id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, l.nombre, l.slug, u.id, u.email::text
  from public.locales l
  join public.miembros_local m on m.local_id = l.id and m.rol = 'dueno' and m.resumen_semanal
  join auth.users u on u.id = m.user_id
  where l.activo and u.email is not null and u.email_confirmed_at is not null
  order by l.id;
$$;

revoke execute on function public.resumen_semanal(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.destinatarios_resumen() from public, anon, authenticated;
grant execute on function public.resumen_semanal(uuid, timestamptz) to service_role;
grant execute on function public.destinatarios_resumen() to service_role;
