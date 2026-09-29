-- =============================================================================
-- App móvil (Point para iOS): el cliente entra con su WhatsApp, igual que la
-- recuperación de la web, y recibe un token de dispositivo (tabla dispositivos).
-- Registro de intentos para frenar a quien pruebe números en masa.
-- =============================================================================

create table public.intentos_app (
  id         bigint generated always as identity primary key,
  -- sha256 de la IP (no guardamos la IP).
  ip_hash    text not null check (length(ip_hash) = 64),
  exitoso    boolean not null,
  created_at timestamptz not null default now()
);
create index intentos_app_ip_idx on public.intentos_app (ip_hash, created_at desc);

alter table public.intentos_app enable row level security;
revoke all on public.intentos_app from anon, authenticated;
grant all on public.intentos_app to service_role;
-- Sin políticas: sólo el servidor (service_role) lo usa.
