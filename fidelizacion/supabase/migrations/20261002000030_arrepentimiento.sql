-- =============================================================================
-- Botón de arrepentimiento (Res. 424/2020, Ley 24.240 art. 34): cualquiera que
-- compró online puede revocar la compra dentro de los 10 días corridos, con un
-- link visible en la página de inicio y sin tener que loguearse. Se le da un
-- código de trámite al momento.
-- =============================================================================
create table public.solicitudes_arrepentimiento (
  id          uuid primary key default gen_random_uuid(),
  codigo      text not null unique,
  nombre      text not null check (char_length(btrim(nombre)) between 2 and 80),
  email       text not null check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  tipo        text not null check (tipo in ('suscripcion', 'pedido')),
  referencia  text check (referencia is null or char_length(referencia) <= 80),
  motivo      text check (motivo is null or char_length(motivo) <= 500),
  estado      text not null default 'nueva' check (estado in ('nueva', 'resuelta')),
  resuelta_en timestamptz,
  created_at  timestamptz not null default now()
);
create index solicitudes_arrepentimiento_estado on public.solicitudes_arrepentimiento (estado, created_at desc);

-- Sólo el servidor (service role) lee y escribe.
alter table public.solicitudes_arrepentimiento enable row level security;
revoke all on public.solicitudes_arrepentimiento from anon, authenticated;
