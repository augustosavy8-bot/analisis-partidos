-- =============================================================================
-- Club de socios: un llavero "de socios" hace socio al cliente con el toque, y
-- la tarjeta de socio se ve distinta (colores del club y la insignia SOCIO).
--  - chips.da_socio: el toque con este llavero hace socio a quien no lo era.
--  - tarjetas.socio_desde: desde cuándo es socio (null = no es socio).
--  - locales.club_*: nombre y colores de la tarjeta de socio (null = por defecto).
-- =============================================================================

alter table public.chips add column if not exists da_socio boolean not null default false;
comment on column public.chips.da_socio is 'Llavero de socios: el toque hace socio al cliente (si todavía no lo era).';
grant select (da_socio) on public.chips to authenticated;

alter table public.tarjetas add column if not exists socio_desde timestamptz;
comment on column public.tarjetas.socio_desde is 'Desde cuándo el cliente es socio del club del local (null = no es socio).';
grant select (socio_desde) on public.tarjetas to authenticated;

alter table public.locales
  add column if not exists club_nombre text
    check (club_nombre is null or length(trim(club_nombre)) between 2 and 40),
  add column if not exists club_color_primario text
    check (club_color_primario is null or club_color_primario ~* '^#[0-9a-f]{6}$'),
  add column if not exists club_color_secundario text
    check (club_color_secundario is null or club_color_secundario ~* '^#[0-9a-f]{6}$');
comment on column public.locales.club_nombre is 'Nombre del club de socios (ej: Club Di Vinee). null = sin nombre propio.';
comment on column public.locales.club_color_primario is 'Fondo de la tarjeta de socio. null = el de socio por defecto.';
comment on column public.locales.club_color_secundario is 'Acento de la tarjeta de socio. null = el de socio por defecto.';

-- El toque con un llavero de socios también hace socio (si el toque se aceptó:
-- suma, canje o límite de tiempo). Devuelve nuevo_socio = true la primera vez.
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
  v_res        jsonb;
begin
  v_tarjeta_id := public.asegurar_tarjeta(p_cliente_id, p_local_id);
  select serial into v_serial from public.tarjetas where id = v_tarjeta_id;

  select id into v_canje_id from public.canjes
   where tarjeta_id = v_tarjeta_id and estado = 'pendiente' and expira_en > now();

  if v_canje_id is not null then
    v_r := public.confirmar_canje(v_canje_id, p_mozo_id, p_chip_id, p_origen);
    if not (v_r->>'ok')::boolean then
      return jsonb_build_object('tipo', 'error', 'motivo', v_r->>'motivo');
    end if;
    v_res := jsonb_build_object('tipo', 'canje', 'movimiento_id', v_r->'movimiento_id', 'serial', v_serial);
  else
    if not public.suma_habilitada_local(p_local_id) then
      perform public.marcar_toque(v_tarjeta_id, p_mozo_id, p_chip_id, p_origen);
      return jsonb_build_object('tipo', 'error', 'motivo', 'programa_pausado');
    end if;

    v_r := public.registrar_suma(v_tarjeta_id, p_mozo_id, p_chip_id, p_origen);
    if (v_r->>'ok')::boolean then
      v_res := jsonb_build_object('tipo', 'suma', 'movimiento_id', v_r->'movimiento_id', 'serial', v_serial);
    elsif v_r->>'motivo' = 'limite' then
      v_res := jsonb_build_object('tipo', 'limite', 'proximo_en', v_r->'proximo_en', 'serial', v_serial);
    else
      return jsonb_build_object('tipo', 'error', 'motivo', v_r->>'motivo');
    end if;
    perform public.marcar_toque(v_tarjeta_id, p_mozo_id, p_chip_id, p_origen);
  end if;

  -- Llavero de socios: el toque hace socio a quien todavía no lo era.
  if p_chip_id is not null
     and exists (select 1 from public.chips where id = p_chip_id and local_id = p_local_id and da_socio) then
    update public.tarjetas set socio_desde = now(), actualizada_en = now()
     where id = v_tarjeta_id and socio_desde is null;
    if found then
      v_res := v_res || jsonb_build_object('nuevo_socio', true);
    end if;
  end if;
  return v_res;
end;
$$;
revoke execute on function public.aplicar_toque(uuid, uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.aplicar_toque(uuid, uuid, uuid, uuid, text) to service_role;

-- Panel: los clientes del local que son socios (para marcarlos en la lista y el CSV).
-- Un array (no filas) para no chocar con el máximo de filas de la API.
create or replace function public.panel_socios(p_local_id uuid)
returns uuid[]
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.puede_gestionar_local(p_local_id) then
    raise exception 'sin permiso' using errcode = '42501';
  end if;
  return coalesce(
    (select array_agg(t.cliente_id order by t.socio_desde)
       from public.tarjetas t
      where t.local_id = p_local_id and t.socio_desde is not null),
    '{}');
end;
$$;
revoke execute on function public.panel_socios(uuid) from public, anon;
grant execute on function public.panel_socios(uuid) to authenticated, service_role;

-- Panel: hacer socio o quitar de socios a mano (correcciones). Devuelve el serial
-- de la tarjeta si cambió (para actualizar las billeteras) o null si ya estaba así.
create or replace function public.panel_cambiar_socio(p_local_id uuid, p_cliente_id uuid, p_socio boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_serial text;
begin
  if not public.puede_gestionar_local(p_local_id) then
    raise exception 'sin permiso' using errcode = '42501';
  end if;
  update public.tarjetas
     set socio_desde = case when p_socio then now() end, actualizada_en = now()
   where local_id = p_local_id and cliente_id = p_cliente_id
     and (socio_desde is null) = p_socio
  returning serial into v_serial;
  return v_serial;
end;
$$;
revoke execute on function public.panel_cambiar_socio(uuid, uuid, boolean) from public, anon;
grant execute on function public.panel_cambiar_socio(uuid, uuid, boolean) to authenticated, service_role;
