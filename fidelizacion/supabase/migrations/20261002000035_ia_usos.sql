-- =============================================================================
-- Mensajes escritos con IA (Claude): registro de usos para poner un tope por
-- local y por día (cada uso cuesta plata de la API).
-- =============================================================================
create table public.ia_usos (
  id          bigint generated always as identity primary key,
  local_id    uuid not null references public.locales (id) on delete cascade,
  tipo        text not null,
  tokens_in   integer,
  tokens_out  integer,
  created_at  timestamptz not null default now()
);
create index ia_usos_local_idx on public.ia_usos (local_id, created_at desc);
alter table public.ia_usos enable row level security;
revoke all on public.ia_usos from anon, authenticated;
grant all on public.ia_usos to service_role;
-- Sin políticas: sólo el servidor (service_role) lo usa.
