-- =============================================================================
-- Eliminar un cliente desde el panel (pedido del cliente o limpieza).
-- Borra su tarjeta en el local (con puntos, historial y canjes). Si ya no le
-- queda tarjeta en ningún local, borra también sus datos personales y celulares.
-- =============================================================================

create or replace function public.eliminar_cliente_de_local(p_local_id uuid, p_cliente_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_borradas integer;
  v_cliente_borrado boolean := false;
begin
  if not public.puede_gestionar_local(p_local_id) then
    raise exception 'sin permiso' using errcode = '42501';
  end if;

  delete from public.tarjetas where local_id = p_local_id and cliente_id = p_cliente_id;
  get diagnostics v_borradas = row_count;
  if v_borradas = 0 then
    return jsonb_build_object('ok', false, 'motivo', 'no_encontrado');
  end if;

  if not exists (select 1 from public.tarjetas where cliente_id = p_cliente_id) then
    delete from public.clientes where id = p_cliente_id;
    v_cliente_borrado := true;
  end if;

  return jsonb_build_object('ok', true, 'cliente_borrado', v_cliente_borrado);
end;
$$;

revoke execute on function public.eliminar_cliente_de_local(uuid, uuid) from public, anon;
grant execute on function public.eliminar_cliente_de_local(uuid, uuid) to authenticated, service_role;
