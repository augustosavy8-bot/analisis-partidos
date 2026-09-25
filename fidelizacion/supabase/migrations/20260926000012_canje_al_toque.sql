-- =============================================================================
-- Canje al toque: un solo toque y una sola pestaña.
-- Cada toque válido (chip o QR) deja registrado en la tarjeta quién y cuándo.
-- Durante los minutos siguientes el cliente puede canjear desde esa misma
-- pantalla: el toque reciente prueba que está en el local, frente al personal.
-- (El flujo anterior, canje pendiente + toque, sigue funcionando.)
-- =============================================================================

alter table public.tarjetas
  add column ultimo_toque_en      timestamptz,
  add column ultimo_toque_mozo_id uuid,
  add column ultimo_toque_chip_id uuid references public.chips (id) on delete set null,
  add column ultimo_toque_origen  text check (ultimo_toque_origen in ('nfc', 'qr')),
  add constraint tarjetas_ultimo_toque_mozo_fk foreign key (ultimo_toque_mozo_id, local_id)
    references public.mozos (id, local_id) on delete set null (ultimo_toque_mozo_id);

-- Registra un toque válido (se llama después de sumar o de rechazar por límite de tiempo).
create or replace function public.marcar_toque(p_tarjeta_id uuid, p_mozo_id uuid, p_chip_id uuid, p_origen text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.tarjetas
     set ultimo_toque_en = now(), ultimo_toque_mozo_id = p_mozo_id,
         ultimo_toque_chip_id = p_chip_id, ultimo_toque_origen = p_origen
   where id = p_tarjeta_id;
$$;

-- Canjea en un paso si hubo un toque en los últimos p_minutos. Consume el toque
-- (un toque = un canje). Devuelve {ok, puntos, movimiento_id, premio} o {ok:false, motivo}.
create or replace function public.canjear_con_toque(p_tarjeta_id uuid, p_premio_id uuid, p_minutos integer default 5)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tarjeta  public.tarjetas%rowtype;
  v_premio   public.premios%rowtype;
  v_canje_id uuid;
  v_mov_id   uuid;
begin
  select * into v_tarjeta from public.tarjetas where id = p_tarjeta_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'tarjeta_inexistente');
  end if;

  if v_tarjeta.ultimo_toque_en is null
     or v_tarjeta.ultimo_toque_en < now() - make_interval(mins => p_minutos)
     or v_tarjeta.ultimo_toque_mozo_id is null
     or not exists (select 1 from public.mozos where id = v_tarjeta.ultimo_toque_mozo_id and activo) then
    return jsonb_build_object('ok', false, 'motivo', 'sin_toque');
  end if;

  select * into v_premio from public.premios
   where id = p_premio_id and local_id = v_tarjeta.local_id and activo;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'premio_invalido');
  end if;

  if v_tarjeta.puntos < v_premio.puntos_necesarios then
    return jsonb_build_object('ok', false, 'motivo', 'puntos_insuficientes');
  end if;

  -- Si había un canje pendiente, se reemplaza por este.
  update public.canjes
     set estado = case when expira_en < now() then 'expirado' else 'cancelado' end, resuelto_en = now()
   where tarjeta_id = p_tarjeta_id and estado = 'pendiente';

  insert into public.canjes (tarjeta_id, local_id, premio_id, estado, mozo_id, resuelto_en)
  values (p_tarjeta_id, v_tarjeta.local_id, p_premio_id, 'confirmado', v_tarjeta.ultimo_toque_mozo_id, now())
  returning id into v_canje_id;

  insert into public.movimientos (tarjeta_id, local_id, mozo_id, chip_id, canje_id, tipo, puntos, origen)
  values (p_tarjeta_id, v_tarjeta.local_id, v_tarjeta.ultimo_toque_mozo_id, v_tarjeta.ultimo_toque_chip_id,
          v_canje_id, 'canje', -v_premio.puntos_necesarios, v_tarjeta.ultimo_toque_origen)
  returning id into v_mov_id;

  update public.tarjetas
     set puntos = puntos - v_premio.puntos_necesarios, actualizada_en = now(),
         ultimo_toque_en = null
   where id = p_tarjeta_id
  returning puntos into v_tarjeta.puntos;

  return jsonb_build_object('ok', true, 'puntos', v_tarjeta.puntos, 'movimiento_id', v_mov_id, 'premio', v_premio.nombre);
end;
$$;

revoke execute on function public.marcar_toque(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.canjear_con_toque(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.marcar_toque(uuid, uuid, uuid, text) to service_role;
grant execute on function public.canjear_con_toque(uuid, uuid, integer) to service_role;
