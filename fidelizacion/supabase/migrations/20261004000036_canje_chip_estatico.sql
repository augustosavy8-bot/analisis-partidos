-- =============================================================================
-- Canje con chips de link fijo (modo prueba): exige el PIN de alguien del local.
--
-- El link de un chip en modo prueba es siempre el mismo: quien lo guarda puede
-- abrirlo desde su casa, abrir la ventana de "canje al toque" y canjear sin que
-- nadie del local esté presente. Con estos chips el canje ahora requiere que un
-- integrante del equipo confirme con su PIN (verificado en el servidor, con el
-- límite de intentos de siempre). Los chips NTAG 424 DNA (URL que cambia en cada
-- toque) y los QR del mozo siguen canjeando al toque como antes.
-- =============================================================================

create or replace function public.canjear_al_toque(
  p_tarjeta_id uuid,
  p_premio_id uuid,
  p_minutos integer default 5,
  p_mozo_confirmado uuid default null
)
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
  v_mozo     uuid;
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

  v_mozo := v_tarjeta.ultimo_toque_mozo_id;
  -- Toque con un chip de link fijo: hace falta la confirmación (PIN) de alguien del local.
  if exists (select 1 from public.chips where id = v_tarjeta.ultimo_toque_chip_id and modo = 'prueba') then
    if p_mozo_confirmado is null then
      return jsonb_build_object('ok', false, 'motivo', 'requiere_pin');
    end if;
    if not exists (select 1 from public.mozos
                    where id = p_mozo_confirmado and local_id = v_tarjeta.local_id and activo) then
      return jsonb_build_object('ok', false, 'motivo', 'pin_invalido');
    end if;
    v_mozo := p_mozo_confirmado;
  end if;

  select * into v_premio from public.premios
   where id = p_premio_id and local_id = v_tarjeta.local_id and activo;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'premio_invalido');
  end if;

  if v_tarjeta.puntos < v_premio.puntos_necesarios then
    return jsonb_build_object('ok', false, 'motivo', 'puntos_insuficientes');
  end if;

  update public.canjes
     set estado = case when expira_en < now() then 'expirado' else 'cancelado' end, resuelto_en = now()
   where tarjeta_id = p_tarjeta_id and estado = 'pendiente';

  insert into public.canjes (tarjeta_id, local_id, premio_id, estado, mozo_id, resuelto_en)
  values (p_tarjeta_id, v_tarjeta.local_id, p_premio_id, 'confirmado', v_mozo, now())
  returning id into v_canje_id;

  insert into public.movimientos (tarjeta_id, local_id, mozo_id, chip_id, canje_id, tipo, puntos, origen)
  values (p_tarjeta_id, v_tarjeta.local_id, v_mozo, v_tarjeta.ultimo_toque_chip_id,
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

revoke execute on function public.canjear_al_toque(uuid, uuid, integer, uuid) from public, anon, authenticated;
grant execute on function public.canjear_al_toque(uuid, uuid, integer, uuid) to service_role;

-- La función vieja queda como atajo sin confirmación (mismo comportamiento: con chip fijo pide PIN).
create or replace function public.canjear_con_toque(p_tarjeta_id uuid, p_premio_id uuid, p_minutos integer default 5)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.canjear_al_toque(p_tarjeta_id, p_premio_id, p_minutos, null);
$$;
