-- =============================================================================
-- Velocidad: un toque en UNA sola llamada a la base (antes eran 5 seguidas):
-- asegura la tarjeta, confirma el canje pendiente o suma, y registra el toque
-- para el canje al toque. Devuelve también el serial (para la billetera).
--   {tipo: 'suma'|'canje', movimiento_id, serial}
--   {tipo: 'limite', proximo_en, serial}
--   {tipo: 'error', motivo}
-- =============================================================================

create or replace function public.aplicar_toque(
  p_cliente_id uuid,
  p_local_id   uuid,
  p_mozo_id    uuid,
  p_chip_id    uuid,
  p_origen     text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tarjeta_id uuid;
  v_serial     text;
  v_canje_id   uuid;
  v_r          jsonb;
begin
  v_tarjeta_id := public.asegurar_tarjeta(p_cliente_id, p_local_id);
  select serial into v_serial from public.tarjetas where id = v_tarjeta_id;

  select id into v_canje_id from public.canjes
   where tarjeta_id = v_tarjeta_id and estado = 'pendiente' and expira_en > now();

  if v_canje_id is not null then
    v_r := public.confirmar_canje(v_canje_id, p_mozo_id, p_chip_id, p_origen);
    if (v_r->>'ok')::boolean then
      return jsonb_build_object('tipo', 'canje', 'movimiento_id', v_r->'movimiento_id', 'serial', v_serial);
    end if;
    return jsonb_build_object('tipo', 'error', 'motivo', v_r->>'motivo');
  end if;

  v_r := public.registrar_suma(v_tarjeta_id, p_mozo_id, p_chip_id, p_origen);
  if (v_r->>'ok')::boolean or v_r->>'motivo' = 'limite' then
    perform public.marcar_toque(v_tarjeta_id, p_mozo_id, p_chip_id, p_origen);
  end if;
  if (v_r->>'ok')::boolean then
    return jsonb_build_object('tipo', 'suma', 'movimiento_id', v_r->'movimiento_id', 'serial', v_serial);
  end if;
  if v_r->>'motivo' = 'limite' then
    return jsonb_build_object('tipo', 'limite', 'proximo_en', v_r->'proximo_en', 'serial', v_serial);
  end if;
  return jsonb_build_object('tipo', 'error', 'motivo', v_r->>'motivo');
end;
$$;

revoke execute on function public.aplicar_toque(uuid, uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.aplicar_toque(uuid, uuid, uuid, uuid, text) to service_role;
