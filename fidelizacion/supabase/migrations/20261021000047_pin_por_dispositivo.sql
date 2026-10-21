-- PIN del personal: el bloqueo corto (5 fallos en 15 min) era por persona del
-- equipo, desde cualquier lado. Como los nombres del equipo son públicos (pantalla
-- del QR de respaldo), cualquiera podía bloquearle el PIN a todo un local a
-- propósito. Ahora el bloqueo corto es por persona + dispositivo (IP); contra el
-- que prueba PINs desde muchas IPs queda un tope diario por persona más alto.
alter table public.intentos_pin add column if not exists ip_hash text;
create index if not exists intentos_pin_mozo_ip_idx on public.intentos_pin (mozo_id, ip_hash, created_at);

create or replace function public.reservar_intento_pin_ip(p_mozo_id uuid, p_ip_hash text, p_max_fallos integer, p_ventana_min integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fallos integer;
  v_id bigint;
begin
  perform 1 from public.mozos where id = p_mozo_id for update;
  if not found then return jsonb_build_object('id', null, 'fallos', 0); end if;
  select count(*) into v_fallos from public.intentos_pin
   where mozo_id = p_mozo_id and ip_hash is not distinct from p_ip_hash and not exitoso
     and created_at > now() - make_interval(mins => p_ventana_min);
  if v_fallos >= p_max_fallos then
    return jsonb_build_object('id', null, 'fallos', v_fallos);
  end if;
  insert into public.intentos_pin (mozo_id, exitoso, ip_hash) values (p_mozo_id, false, p_ip_hash) returning id into v_id;
  return jsonb_build_object('id', v_id, 'fallos', v_fallos + 1);
end;
$$;
revoke execute on function public.reservar_intento_pin_ip(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.reservar_intento_pin_ip(uuid, text, integer, integer) to service_role;
