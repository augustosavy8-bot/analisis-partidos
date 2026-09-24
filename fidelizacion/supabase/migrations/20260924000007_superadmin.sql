-- =============================================================================
-- Superadmin: registro de toques rechazados y resumen general.
-- =============================================================================

-- Toques rechazados (chip desconocido, QR reusado/vencido, límite de tiempo...).
-- Sirve para detectar intentos de fraude o chips mal configurados.
create table public.rechazos (
  id         bigint generated always as identity primary key,
  local_id   uuid references public.locales (id) on delete cascade,
  chip_id    uuid references public.chips (id) on delete set null,
  motivo     text not null check (length(motivo) <= 40),
  origen     text check (origen in ('nfc', 'qr')),
  created_at timestamptz not null default now()
);
create index rechazos_fecha_idx on public.rechazos (created_at desc);
create index rechazos_local_idx on public.rechazos (local_id, created_at desc);

alter table public.rechazos enable row level security;
revoke all on public.rechazos from anon, authenticated;
grant all on public.rechazos to service_role;
grant select on public.rechazos to authenticated;
create policy rechazos_select on public.rechazos
  for select to authenticated
  using (public.es_superadmin() or (local_id is not null and public.es_dueno(local_id)));

-- Resumen general para el superadmin.
create or replace function public.admin_resumen()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_hoy   timestamptz := date_trunc('day', now() at time zone 'America/Argentina/Buenos_Aires')
                         at time zone 'America/Argentina/Buenos_Aires';
  v_30d   timestamptz := now() - interval '30 days';
begin
  if not public.es_superadmin() then
    raise exception 'sin permiso' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'totales', jsonb_build_object(
      'locales', (select count(*) from public.locales),
      'clientes', (select count(*) from public.clientes),
      'visitas_hoy', (select count(*) from public.movimientos where tipo = 'suma' and created_at >= v_hoy),
      'canjes_hoy', (select count(*) from public.movimientos where tipo = 'canje' and created_at >= v_hoy),
      'visitas_30d', (select count(*) from public.movimientos where tipo = 'suma' and created_at >= v_30d),
      'rechazos_24h', (select count(*) from public.rechazos where created_at >= now() - interval '24 hours')
    ),
    'locales', (
      select coalesce(jsonb_agg(x order by x.activo desc, x.nombre), '[]'::jsonb) from (
        select l.id, l.slug, l.nombre, l.activo, l.created_at,
          (select count(*) from public.tarjetas t where t.local_id = l.id) as clientes,
          (select count(*) from public.movimientos m where m.local_id = l.id and m.tipo = 'suma' and m.created_at >= v_30d) as visitas_30d,
          (select count(*) from public.movimientos m where m.local_id = l.id and m.tipo = 'suma' and m.created_at >= v_hoy) as visitas_hoy,
          (select max(m.created_at) from public.movimientos m where m.local_id = l.id) as ultimo_movimiento,
          (select count(*) from public.mozos z where z.local_id = l.id and z.activo) as mozos,
          (select count(*) from public.chips c where c.local_id = l.id and c.activo and c.modo = 'prueba') as chips_prueba,
          (select count(*) from public.chips c where c.local_id = l.id and c.activo and c.modo = 'produccion') as chips_produccion,
          (select count(*) from public.miembros_local ml where ml.local_id = l.id) as duenos
        from public.locales l
      ) x
    ),
    'rechazos_por_motivo', (
      select coalesce(jsonb_agg(jsonb_build_object('motivo', motivo, 'cantidad', n) order by n desc), '[]'::jsonb)
      from (select motivo, count(*) as n from public.rechazos
            where created_at >= now() - interval '7 days' group by motivo) r
    ),
    'rechazos_recientes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'motivo', r.motivo, 'origen', r.origen, 'created_at', r.created_at,
        'local', l.nombre, 'chip', coalesce(c.etiqueta, c.uid)) order by r.created_at desc), '[]'::jsonb)
      from (select * from public.rechazos order by created_at desc limit 15) r
      left join public.locales l on l.id = r.local_id
      left join public.chips c on c.id = r.chip_id
    )
  );
end;
$$;

revoke execute on function public.admin_resumen() from public, anon;
grant execute on function public.admin_resumen() to authenticated, service_role;
