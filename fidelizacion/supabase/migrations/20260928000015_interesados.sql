-- =============================================================================
-- Interesados: dueños de locales que dejan sus datos en la landing de Point.
-- Los carga el servidor (service_role); sólo el superadmin los ve y los gestiona.
-- =============================================================================

create table public.interesados (
  id          bigint generated always as identity primary key,
  nombre      text not null check (length(trim(nombre)) between 2 and 80),
  local       text not null check (length(trim(local)) between 2 and 80),
  rubro       text not null check (length(rubro) between 2 and 40),
  ciudad      text check (length(ciudad) <= 60),
  whatsapp    text not null check (whatsapp ~ '^\+[1-9][0-9]{7,14}$'),
  mensaje     text check (length(mensaje) <= 500),
  estado      text not null default 'nuevo' check (estado in ('nuevo', 'contactado', 'descartado')),
  created_at  timestamptz not null default now()
);
create index interesados_fecha_idx on public.interesados (created_at desc);

alter table public.interesados enable row level security;
revoke all on public.interesados from anon, authenticated;
grant all on public.interesados to service_role;
grant select on public.interesados to authenticated;
grant update (estado) on public.interesados to authenticated;
create policy interesados_select on public.interesados for select to authenticated
  using (public.es_superadmin());
create policy interesados_update on public.interesados for update to authenticated
  using (public.es_superadmin()) with check (public.es_superadmin());
