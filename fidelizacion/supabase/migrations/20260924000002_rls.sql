-- =============================================================================
-- Row Level Security.
--
-- Modelo de acceso:
--  * anon: sin acceso directo a ninguna tabla. Los clientes finales operan a
--    través de rutas del servidor que usan service_role.
--  * authenticated: usuarios del panel (superadmin o dueño). Ven sólo los datos
--    de sus locales. Los secretos (claves de chips, hashes) no se exponen: se
--    usan privilegios por columna además de RLS.
--  * service_role: bypass de RLS; sólo se usa en el servidor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers (security definer para no depender de RLS de las tablas de membresía)
-- -----------------------------------------------------------------------------
create or replace function public.es_superadmin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.superadmins where user_id = (select auth.uid())
  );
$$;

create or replace function public.es_dueno(p_local_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.miembros_local
    where user_id = (select auth.uid()) and local_id = p_local_id and rol = 'dueno'
  );
$$;

create or replace function public.puede_gestionar_local(p_local_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.es_superadmin() or public.es_dueno(p_local_id);
$$;

revoke execute on function public.es_superadmin() from public, anon;
revoke execute on function public.es_dueno(uuid) from public, anon;
revoke execute on function public.puede_gestionar_local(uuid) from public, anon;
grant execute on function public.es_superadmin() to authenticated, service_role;
grant execute on function public.es_dueno(uuid) to authenticated, service_role;
grant execute on function public.puede_gestionar_local(uuid) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Activar RLS en todas las tablas
-- -----------------------------------------------------------------------------
alter table public.locales          enable row level security;
alter table public.superadmins      enable row level security;
alter table public.miembros_local   enable row level security;
alter table public.mozos            enable row level security;
alter table public.chips            enable row level security;
alter table public.clientes         enable row level security;
alter table public.tarjetas         enable row level security;
alter table public.premios          enable row level security;
alter table public.canjes           enable row level security;
alter table public.movimientos      enable row level security;
alter table public.dispositivos     enable row level security;
alter table public.qr_usados        enable row level security;
alter table public.wallet_registros enable row level security;

-- -----------------------------------------------------------------------------
-- Privilegios: partimos de cero y otorgamos lo mínimo.
-- (Supabase otorga ALL a anon/authenticated por defecto en el schema public.)
-- -----------------------------------------------------------------------------
revoke all on
  public.locales, public.superadmins, public.miembros_local, public.mozos,
  public.chips, public.clientes, public.tarjetas, public.premios, public.canjes,
  public.movimientos, public.dispositivos, public.qr_usados, public.wallet_registros
from anon, authenticated;

grant all on
  public.locales, public.superadmins, public.miembros_local, public.mozos,
  public.chips, public.clientes, public.tarjetas, public.premios, public.canjes,
  public.movimientos, public.dispositivos, public.qr_usados, public.wallet_registros
to service_role;

-- Lectura para usuarios del panel (filtrada por RLS)
grant select on
  public.locales, public.superadmins, public.miembros_local, public.clientes,
  public.tarjetas, public.premios, public.canjes, public.movimientos
to authenticated;

-- Columnas no sensibles de mozos y chips
grant select (id, local_id, nombre, activo, created_at) on public.mozos to authenticated;
grant select (id, uid, local_id, mozo_id, etiqueta, ultimo_contador, modo, activo, ultimo_uso, created_at)
  on public.chips to authenticated;

-- Escrituras del dueño
grant update (nombre, rubro, logo_url, color_primario, color_secundario, minutos_entre_puntos, zona_horaria)
  on public.locales to authenticated;
grant insert (local_id, nombre, pin_hash, activo) on public.mozos to authenticated;
grant update (nombre, pin_hash, activo) on public.mozos to authenticated;
grant insert (local_id, nombre, descripcion, puntos_necesarios, activo, orden) on public.premios to authenticated;
grant update (nombre, descripcion, puntos_necesarios, activo, orden) on public.premios to authenticated;
grant delete on public.premios to authenticated;
grant update (mozo_id, etiqueta) on public.chips to authenticated;

-- -----------------------------------------------------------------------------
-- Políticas
-- -----------------------------------------------------------------------------

-- locales
create policy locales_select on public.locales
  for select to authenticated
  using (public.puede_gestionar_local(id));
create policy locales_update on public.locales
  for update to authenticated
  using (public.puede_gestionar_local(id))
  with check (public.puede_gestionar_local(id));

-- superadmins: cada uno ve sólo su fila (sirve para saber "¿soy superadmin?")
create policy superadmins_select on public.superadmins
  for select to authenticated
  using (user_id = (select auth.uid()));

-- miembros_local
create policy miembros_select on public.miembros_local
  for select to authenticated
  using (user_id = (select auth.uid()) or public.es_superadmin());

-- mozos
create policy mozos_select on public.mozos
  for select to authenticated
  using (public.puede_gestionar_local(local_id));
create policy mozos_insert on public.mozos
  for insert to authenticated
  with check (public.puede_gestionar_local(local_id));
create policy mozos_update on public.mozos
  for update to authenticated
  using (public.puede_gestionar_local(local_id))
  with check (public.puede_gestionar_local(local_id));

-- chips (alta/baja y claves: sólo superadmin vía servidor con service_role)
create policy chips_select on public.chips
  for select to authenticated
  using (public.puede_gestionar_local(local_id));
create policy chips_update on public.chips
  for update to authenticated
  using (public.puede_gestionar_local(local_id))
  with check (public.puede_gestionar_local(local_id));

-- clientes: visibles si tienen tarjeta en un local que el usuario gestiona
create policy clientes_select on public.clientes
  for select to authenticated
  using (
    public.es_superadmin()
    or exists (
      select 1 from public.tarjetas t
      where t.cliente_id = clientes.id and public.es_dueno(t.local_id)
    )
  );

-- tarjetas / movimientos / canjes: sólo lectura, las escrituras van por funciones
create policy tarjetas_select on public.tarjetas
  for select to authenticated
  using (public.puede_gestionar_local(local_id));
create policy movimientos_select on public.movimientos
  for select to authenticated
  using (public.puede_gestionar_local(local_id));
create policy canjes_select on public.canjes
  for select to authenticated
  using (public.puede_gestionar_local(local_id));

-- premios
create policy premios_select on public.premios
  for select to authenticated
  using (public.puede_gestionar_local(local_id));
create policy premios_insert on public.premios
  for insert to authenticated
  with check (public.puede_gestionar_local(local_id));
create policy premios_update on public.premios
  for update to authenticated
  using (public.puede_gestionar_local(local_id))
  with check (public.puede_gestionar_local(local_id));
create policy premios_delete on public.premios
  for delete to authenticated
  using (public.puede_gestionar_local(local_id));

-- dispositivos, qr_usados, wallet_registros: sin políticas => sólo service_role.
