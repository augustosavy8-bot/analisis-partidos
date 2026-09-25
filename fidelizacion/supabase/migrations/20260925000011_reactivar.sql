-- =============================================================================
-- Reactivar clientes por WhatsApp: listas por segmento, registro de mensajes
-- enviados, plantillas por local y "no contactar" por tarjeta.
-- Los mensajes se mandan desde el WhatsApp del dueño (links wa.me), sin API.
-- =============================================================================

alter table public.locales
  add column plantillas_whatsapp jsonb not null default '{}'::jsonb
  check (jsonb_typeof(plantillas_whatsapp) = 'object' and length(plantillas_whatsapp::text) <= 4000);
grant update (plantillas_whatsapp) on public.locales to authenticated;

-- El cliente pidió que no le escriban más desde este local.
alter table public.tarjetas
  add column no_contactar boolean not null default false;
grant update (no_contactar) on public.tarjetas to authenticated;
create policy tarjetas_update on public.tarjetas for update to authenticated
  using (public.puede_gestionar_local(local_id)) with check (public.puede_gestionar_local(local_id));

create table public.contactos_whatsapp (
  id         bigint generated always as identity primary key,
  local_id   uuid not null references public.locales (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  segmento   text not null check (segmento in ('inactivos', 'cerca', 'premio', 'cumple')),
  user_id    uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index contactos_whatsapp_idx on public.contactos_whatsapp (local_id, cliente_id, created_at desc);

alter table public.contactos_whatsapp enable row level security;
revoke all on public.contactos_whatsapp from anon, authenticated;
grant all on public.contactos_whatsapp to service_role;
grant select on public.contactos_whatsapp to authenticated;
grant insert (local_id, cliente_id, segmento) on public.contactos_whatsapp to authenticated;
create policy contactos_select on public.contactos_whatsapp for select to authenticated
  using (public.puede_gestionar_local(local_id));
create policy contactos_insert on public.contactos_whatsapp for insert to authenticated
  with check (
    public.puede_gestionar_local(local_id)
    and exists (select 1 from public.tarjetas t where t.local_id = contactos_whatsapp.local_id
                and t.cliente_id = contactos_whatsapp.cliente_id and not t.no_contactar)
  );

-- -----------------------------------------------------------------------------
-- Clientes de un segmento:
--   inactivos: vinieron alguna vez y no vuelven hace p_valor días o más.
--   cerca:     les faltan p_valor puntos o menos para el próximo premio.
--   premio:    ya tienen puntos para un premio y no lo canjearon.
--   cumple:    cumplen años en los próximos p_valor días (incluye hoy).
-- -----------------------------------------------------------------------------
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
  v_tz  text;
  v_hoy date;
begin
  if not public.puede_gestionar_local(p_local_id) then
    raise exception 'sin permiso' using errcode = '42501';
  end if;
  if p_segmento not in ('inactivos', 'cerca', 'premio', 'cumple') then
    raise exception 'segmento inválido' using errcode = '22023';
  end if;
  select zona_horaria into v_tz from public.locales where id = p_local_id;
  v_hoy := (now() at time zone v_tz)::date;

  return query
  with base as (
    select c.id as cliente_id, c.nombre, c.whatsapp, t.puntos, t.no_contactar,
           c.cumple_dia, c.cumple_mes,
           (select count(*) from public.movimientos m where m.tarjeta_id = t.id and m.tipo = 'suma') as visitas,
           (select max(m.created_at) from public.movimientos m where m.tarjeta_id = t.id and m.tipo = 'suma') as ultima_visita,
           (select max(k.created_at) from public.contactos_whatsapp k
             where k.local_id = p_local_id and k.cliente_id = c.id) as ultimo_contacto,
           -- Próximo premio que todavía no alcanza.
           (select p from public.premios p where p.local_id = p_local_id and p.activo
              and p.puntos_necesarios > t.puntos order by p.puntos_necesarios limit 1) as proximo,
           -- Mejor premio que ya alcanza.
           (select p from public.premios p where p.local_id = p_local_id and p.activo
              and p.puntos_necesarios <= t.puntos order by p.puntos_necesarios desc limit 1) as alcanzado,
           case when c.cumple_mes is not null then
             (select min(d) from (values
                (public.fecha_cumple(extract(year from v_hoy)::integer, c.cumple_mes, c.cumple_dia)),
                (public.fecha_cumple(extract(year from v_hoy)::integer + 1, c.cumple_mes, c.cumple_dia))) x(d)
              where d >= v_hoy)
           end as proximo_cumple
    from public.tarjetas t
    join public.clientes c on c.id = t.cliente_id
    where t.local_id = p_local_id
  )
  select b.cliente_id, b.nombre, b.whatsapp, b.puntos, b.visitas, b.ultima_visita,
         case when p_segmento = 'premio' then (b.alcanzado).nombre else (b.proximo).nombre end,
         case when p_segmento = 'premio' then (b.alcanzado).puntos_necesarios else (b.proximo).puntos_necesarios end,
         b.cumple_dia, b.cumple_mes, b.ultimo_contacto, b.no_contactar
  from base b
  where case p_segmento
    when 'inactivos' then b.ultima_visita < now() - make_interval(days => p_valor)
    when 'cerca'     then (b.proximo).id is not null and (b.proximo).puntos_necesarios - b.puntos <= p_valor
    when 'premio'    then (b.alcanzado).id is not null
    when 'cumple'    then b.proximo_cumple <= v_hoy + p_valor
  end
  order by
    b.no_contactar,
    case when p_segmento = 'cumple' then b.proximo_cumple end,
    case when p_segmento = 'cerca' then (b.proximo).puntos_necesarios - b.puntos end,
    b.ultima_visita desc nulls last
  limit 300;
end;
$$;

revoke execute on function public.panel_reactivar(uuid, text, integer) from public, anon;
grant execute on function public.panel_reactivar(uuid, text, integer) to authenticated, service_role;
