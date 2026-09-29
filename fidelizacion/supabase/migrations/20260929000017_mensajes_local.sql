-- =============================================================================
-- Mensajes del local a sus clientes (llegan como notificación a los pases de
-- Google Wallet y Apple Wallet). Límite propio: 1 mensaje cada 24 horas por local.
-- =============================================================================

create table public.mensajes_local (
  id               uuid primary key default gen_random_uuid(),
  local_id         uuid not null references public.locales (id) on delete cascade,
  titulo           text not null check (char_length(titulo) between 2 and 40),
  texto            text not null check (char_length(texto) between 2 and 150),
  enviado_por      uuid references auth.users (id) on delete set null,
  -- enviando → enviado | error (un error no cuenta para el límite diario)
  estado           text not null default 'enviando' check (estado in ('enviando', 'enviado', 'error')),
  google_enviados  integer not null default 0,
  google_fallidos  integer not null default 0,
  apple_pases      integer not null default 0,
  created_at       timestamptz not null default now()
);
create index mensajes_local_local_fecha on public.mensajes_local (local_id, created_at desc);

alter table public.mensajes_local enable row level security;
create policy mensajes_local_select on public.mensajes_local
  for select to authenticated using (public.puede_gestionar_local(local_id));
revoke insert, update, delete on public.mensajes_local from anon, authenticated;
grant select on public.mensajes_local to authenticated;
grant all on public.mensajes_local to service_role;

-- Próximo momento en que el local puede mandar un mensaje (null = ya puede).
create or replace function public.proximo_mensaje_local(p_local_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select max(created_at) + interval '24 hours'
  from public.mensajes_local
  where local_id = p_local_id and estado <> 'error'
  having max(created_at) + interval '24 hours' > now();
$$;

-- Registra un mensaje respetando el límite (atómico: bloquea la fila del local).
create or replace function public.registrar_mensaje_local(p_local_id uuid, p_titulo text, p_texto text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_proximo timestamptz;
  v_id uuid;
begin
  if not public.puede_gestionar_local(p_local_id) then
    raise exception 'sin permiso' using errcode = '42501';
  end if;
  perform 1 from public.locales where id = p_local_id for update;
  v_proximo := public.proximo_mensaje_local(p_local_id);
  if v_proximo is not null then
    return jsonb_build_object('ok', false, 'motivo', 'limite', 'proximo', v_proximo);
  end if;
  insert into public.mensajes_local (local_id, titulo, texto, enviado_por)
  values (p_local_id, btrim(p_titulo), btrim(p_texto), auth.uid())
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

revoke execute on function public.proximo_mensaje_local(uuid) from public, anon;
revoke execute on function public.registrar_mensaje_local(uuid, text, text) from public, anon;
grant execute on function public.proximo_mensaje_local(uuid) to authenticated, service_role;
grant execute on function public.registrar_mensaje_local(uuid, text, text) to authenticated, service_role;
