-- Límite de mensajes configurable por local (lo define el superadmin; el dueño no lo edita).
-- 24 = uno por día (el valor de siempre). 0 = sin límite.
alter table public.locales
  add column horas_entre_mensajes integer not null default 24
  check (horas_entre_mensajes between 0 and 168);

comment on column public.locales.horas_entre_mensajes is
  'Horas mínimas entre mensajes del local a sus clientes. 0 = sin límite.';

create or replace function public.proximo_mensaje_local(p_local_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select max(m.created_at) + make_interval(hours => l.horas_entre_mensajes)
  from public.mensajes_local m
  join public.locales l on l.id = m.local_id
  where m.local_id = p_local_id and m.estado <> 'error' and l.horas_entre_mensajes > 0
  group by l.horas_entre_mensajes
  having max(m.created_at) + make_interval(hours => l.horas_entre_mensajes) > now();
$$;

-- FairPlay: sin límite de mensajes.
update public.locales set horas_entre_mensajes = 0 where slug = 'fairplay';
