-- =============================================================================
-- QR de respaldo: registro de intentos de PIN de mozos (anti fuerza bruta).
-- =============================================================================

create table public.intentos_pin (
  id         bigint generated always as identity primary key,
  mozo_id    uuid not null references public.mozos (id) on delete cascade,
  exitoso    boolean not null,
  created_at timestamptz not null default now()
);
create index intentos_pin_mozo_idx on public.intentos_pin (mozo_id, created_at desc);

alter table public.intentos_pin enable row level security;
revoke all on public.intentos_pin from anon, authenticated;
grant all on public.intentos_pin to service_role;
-- Sin políticas: sólo el servidor (service_role) lo usa.
