-- =============================================================================
-- Fase 2: alta de clientes y vinculación de dispositivos (sólo service_role).
-- =============================================================================

-- Crea (o reutiliza por WhatsApp) el cliente, vincula el dispositivo y asegura
-- la tarjeta en el local. Todo en una transacción.
-- Devuelve {cliente_id, tarjeta_id, cliente_existia}.
create or replace function public.alta_cliente(
  p_nombre      text,
  p_whatsapp    text,
  p_local_id    uuid,
  p_token_hash  text,
  p_user_agent  text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cliente_id uuid;
  v_existia    boolean := false;
  v_tarjeta_id uuid;
begin
  select id into v_cliente_id from public.clientes where whatsapp = p_whatsapp;
  if found then
    v_existia := true;
  else
    insert into public.clientes (nombre, whatsapp, consentimiento, consentimiento_fecha)
    values (trim(p_nombre), p_whatsapp, true, now())
    on conflict (whatsapp) do nothing
    returning id into v_cliente_id;
    if v_cliente_id is null then
      -- Carrera: otro request lo creó recién.
      select id into v_cliente_id from public.clientes where whatsapp = p_whatsapp;
      v_existia := true;
    end if;
  end if;

  insert into public.dispositivos (cliente_id, token_hash, user_agent)
  values (v_cliente_id, p_token_hash, left(p_user_agent, 300));

  v_tarjeta_id := public.asegurar_tarjeta(v_cliente_id, p_local_id);

  return jsonb_build_object(
    'cliente_id', v_cliente_id,
    'tarjeta_id', v_tarjeta_id,
    'cliente_existia', v_existia
  );
end;
$$;

-- Devuelve la tarjeta del cliente en el local, creándola si no existe.
create or replace function public.asegurar_tarjeta(p_cliente_id uuid, p_local_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.tarjetas (cliente_id, local_id)
  values (p_cliente_id, p_local_id)
  on conflict (cliente_id, local_id) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.tarjetas where cliente_id = p_cliente_id and local_id = p_local_id;
  end if;
  return v_id;
end;
$$;

revoke execute on function public.alta_cliente(text, text, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.asegurar_tarjeta(uuid, uuid) from public, anon, authenticated;
grant execute on function public.alta_cliente(text, text, uuid, text, text) to service_role;
grant execute on function public.asegurar_tarjeta(uuid, uuid) to service_role;
