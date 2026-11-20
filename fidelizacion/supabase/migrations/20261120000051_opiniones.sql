-- Opiniones de los dueños sobre Point (estrellas de 1 a 5 y un comentario opcional),
-- desde un cartel en el Resumen del panel. Sin estrellas = cerró el cartel sin opinar
-- (para no volver a mostrarlo enseguida). Sólo se lee y escribe desde el servidor.
create table public.opiniones (
  id          uuid primary key default gen_random_uuid(),
  local_id    uuid not null references public.locales (id) on delete cascade,
  user_id     uuid not null,
  estrellas   smallint check (estrellas between 1 and 5),
  comentario  text check (length(comentario) <= 1000),
  created_at  timestamptz not null default now()
);
create index opiniones_local_user_idx on public.opiniones (local_id, user_id, created_at desc);
create index opiniones_fecha_idx on public.opiniones (created_at desc);
alter table public.opiniones enable row level security;

-- Referidos: el interesado que llegó por la recomendación de un local (link de WhatsApp
-- del cartel de opiniones). Si se suma, ese local tiene un mes a mitad de precio.
alter table public.interesados add column referido_por uuid references public.locales (id) on delete set null;
