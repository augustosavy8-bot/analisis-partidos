-- Apple Wallet: pases (.pkpass), dispositivos y registros del web service de Apple
-- (PassKit Web Service v1), más coordenadas opcionales del local para que el pase
-- aparezca en la pantalla bloqueada cerca del local.
--
-- Sólo el backend (service_role) accede a las tablas de Apple: RLS activado, sin
-- políticas, y sin privilegios para anon ni authenticated.

-- Un pase por tarjeta (cliente + local). El serial del pase es el de la tarjeta.
create table public.apple_passes (
  serial       text primary key references public.tarjetas (serial) on delete cascade,
  tarjeta_id   uuid not null unique references public.tarjetas (id) on delete cascade,
  cliente_id   uuid not null references public.clientes (id) on delete cascade,
  local_id     uuid not null references public.locales (id) on delete cascade,
  auth_token   text not null check (length(auth_token) >= 32),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index apple_passes_local_idx on public.apple_passes (local_id);

-- Un iPhone/Apple Watch (deviceLibraryIdentifier) con su token de push.
create table public.apple_devices (
  device_library_id text primary key check (length(device_library_id) between 1 and 200),
  push_token        text not null check (length(push_token) between 1 and 200),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Qué dispositivos siguen qué pase.
create table public.apple_registrations (
  device_library_id text not null references public.apple_devices (device_library_id) on delete cascade,
  serial            text not null references public.apple_passes (serial) on delete cascade,
  created_at        timestamptz not null default now(),
  primary key (device_library_id, serial)
);
create index apple_registrations_serial_idx on public.apple_registrations (serial);

alter table public.apple_passes        enable row level security;
alter table public.apple_devices       enable row level security;
alter table public.apple_registrations enable row level security;

revoke all on public.apple_passes, public.apple_devices, public.apple_registrations from public, anon, authenticated;
grant all on public.apple_passes, public.apple_devices, public.apple_registrations to service_role;

-- Coordenadas del local (opcionales): locations del pase de Apple.
alter table public.locales
  add column latitud  double precision check (latitud between -90 and 90),
  add column longitud double precision check (longitud between -180 and 180),
  add constraint locales_coordenadas check ((latitud is null) = (longitud is null));

grant update (latitud, longitud) on public.locales to authenticated;
