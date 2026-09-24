-- =============================================================================
-- Esquema base del SaaS de fidelización.
--
-- Convenciones:
--  * Todas las tablas con datos de un local llevan local_id (denormalizado donde
--    hace falta) para que RLS filtre sin joins caros.
--  * Las FKs compuestas (x_id, local_id) garantizan que el local_id denormalizado
--    sea coherente: no se puede registrar un movimiento de la tarjeta de un local
--    con un mozo de otro local.
--  * Los clientes finales NO usan Supabase Auth: todo su flujo pasa por el
--    servidor (service_role) y se identifican con un token de dispositivo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Locales
-- -----------------------------------------------------------------------------
create table public.locales (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique
                          check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 2 and 60),
  nombre                text not null check (length(trim(nombre)) > 0),
  rubro                 text,
  logo_url              text,
  color_primario        text not null default '#1f2937' check (color_primario ~* '^#[0-9a-f]{6}$'),
  color_secundario      text not null default '#f59e0b' check (color_secundario ~* '^#[0-9a-f]{6}$'),
  -- Regla de puntos: 1 punto cada N minutos por tarjeta (el panel lo muestra en horas).
  minutos_entre_puntos  integer not null default 240 check (minutos_entre_puntos >= 0),
  zona_horaria          text not null default 'America/Argentina/Buenos_Aires',
  activo                boolean not null default true,
  created_at            timestamptz not null default now()
);

comment on column public.locales.minutos_entre_puntos is
  'Límite antifraude: una tarjeta puede sumar como máximo 1 punto cada N minutos. 0 = sin límite.';

-- -----------------------------------------------------------------------------
-- Usuarios del panel (Supabase Auth)
-- -----------------------------------------------------------------------------
create table public.superadmins (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- Un usuario puede ser dueño de varios locales (cadenas). Se deja "rol" para
-- sumar más adelante roles como "encargado".
create table public.miembros_local (
  user_id     uuid not null references auth.users (id) on delete cascade,
  local_id    uuid not null references public.locales (id) on delete cascade,
  rol         text not null default 'dueno' check (rol in ('dueno')),
  created_at  timestamptz not null default now(),
  primary key (user_id, local_id)
);
create index miembros_local_local_idx on public.miembros_local (local_id);

-- -----------------------------------------------------------------------------
-- Mozos
-- -----------------------------------------------------------------------------
create table public.mozos (
  id          uuid primary key default gen_random_uuid(),
  local_id    uuid not null references public.locales (id) on delete cascade,
  nombre      text not null check (length(trim(nombre)) > 0),
  -- Hash scrypt del PIN (formato: scrypt$N$r$p$salt$hash). Se usa para el QR de respaldo.
  pin_hash    text,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (id, local_id)
);
create index mozos_local_idx on public.mozos (local_id);

-- -----------------------------------------------------------------------------
-- Chips NFC
-- -----------------------------------------------------------------------------
create table public.chips (
  id                 uuid primary key default gen_random_uuid(),
  -- UID de 7 bytes en hex mayúscula (14 caracteres) para NTAG 424 DNA.
  uid                text not null unique check (uid ~ '^[0-9A-F]{8,20}$'),
  local_id           uuid not null references public.locales (id) on delete cascade,
  mozo_id            uuid,
  etiqueta           text,
  -- Clave AES-128 SDMFileRead del chip (para verificar el CMAC), cifrada con
  -- AES-256-GCM usando CHIPS_MASTER_KEY del servidor. Nunca se guarda en claro.
  clave_aes_cifrada  text,
  -- Contador SDM más alto aceptado. Se rechaza cualquier lectura <= este valor.
  ultimo_contador    integer not null default -1 check (ultimo_contador >= -1),
  modo               text not null default 'produccion' check (modo in ('prueba', 'produccion')),
  -- Sólo modo prueba: SHA-256 (hex) del token estático grabado en la URL del tag.
  token_prueba_hash  text unique check (token_prueba_hash is null or token_prueba_hash ~ '^[0-9a-f]{64}$'),
  activo             boolean not null default true,
  ultimo_uso         timestamptz,
  created_at         timestamptz not null default now(),
  foreign key (mozo_id, local_id) references public.mozos (id, local_id) on delete set null (mozo_id),
  constraint chips_modo_coherente check (
    (modo = 'prueba' and token_prueba_hash is not null)
    or (modo = 'produccion' and clave_aes_cifrada is not null)
  )
);
create index chips_local_idx on public.chips (local_id);

-- -----------------------------------------------------------------------------
-- Clientes (globales: una persona puede tener tarjetas en varios locales)
-- -----------------------------------------------------------------------------
create table public.clientes (
  id                    uuid primary key default gen_random_uuid(),
  nombre                text not null check (length(trim(nombre)) between 1 and 80),
  -- WhatsApp normalizado en formato E.164 (ej: +5493411234567).
  whatsapp              text not null unique check (whatsapp ~ '^\+[1-9][0-9]{7,14}$'),
  consentimiento        boolean not null check (consentimiento),
  consentimiento_fecha  timestamptz not null default now(),
  -- Hook para OTP por WhatsApp (fase futura): cuándo se verificó el número.
  whatsapp_verificado_en timestamptz,
  created_at            timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Tarjetas (una por cliente y local)
-- -----------------------------------------------------------------------------
create table public.tarjetas (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null references public.clientes (id) on delete cascade,
  local_id         uuid not null references public.locales (id) on delete cascade,
  puntos           integer not null default 0 check (puntos >= 0),
  -- Serial estable: se reutiliza como serialNumber de Apple Wallet / objectId de Google Wallet.
  serial           text not null unique default replace(gen_random_uuid()::text, '-', ''),
  -- Token para el web service de Apple Wallet (authenticationToken). Preparado, sin uso aún.
  wallet_auth_token text not null default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  created_at       timestamptz not null default now(),
  -- Se actualiza en cada cambio de puntos (sirve para passesUpdatedSince de Apple Wallet).
  actualizada_en   timestamptz not null default now(),
  unique (cliente_id, local_id),
  unique (id, local_id)
);
create index tarjetas_local_idx on public.tarjetas (local_id);

-- -----------------------------------------------------------------------------
-- Premios
-- -----------------------------------------------------------------------------
create table public.premios (
  id                 uuid primary key default gen_random_uuid(),
  local_id           uuid not null references public.locales (id) on delete cascade,
  nombre             text not null check (length(trim(nombre)) > 0),
  descripcion        text,
  puntos_necesarios  integer not null check (puntos_necesarios > 0),
  activo             boolean not null default true,
  orden              integer not null default 0,
  created_at         timestamptz not null default now(),
  unique (id, local_id)
);
create index premios_local_idx on public.premios (local_id);

-- -----------------------------------------------------------------------------
-- Canjes (el cliente lo pide y queda pendiente hasta que el mozo lo valida)
-- -----------------------------------------------------------------------------
create table public.canjes (
  id             uuid primary key default gen_random_uuid(),
  tarjeta_id     uuid not null,
  local_id       uuid not null,
  premio_id      uuid not null,
  estado         text not null default 'pendiente'
                   check (estado in ('pendiente', 'confirmado', 'cancelado', 'expirado')),
  mozo_id        uuid,
  created_at     timestamptz not null default now(),
  expira_en      timestamptz not null default now() + interval '15 minutes',
  resuelto_en    timestamptz,
  foreign key (tarjeta_id, local_id) references public.tarjetas (id, local_id) on delete cascade,
  foreign key (premio_id, local_id) references public.premios (id, local_id) on delete cascade,
  foreign key (mozo_id, local_id) references public.mozos (id, local_id)
);
-- Un solo canje pendiente por tarjeta.
create unique index canjes_un_pendiente_idx on public.canjes (tarjeta_id) where estado = 'pendiente';
create index canjes_local_idx on public.canjes (local_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Movimientos (libro contable de puntos: toda suma o canje queda registrado)
-- -----------------------------------------------------------------------------
create table public.movimientos (
  id          uuid primary key default gen_random_uuid(),
  tarjeta_id  uuid not null,
  local_id    uuid not null,
  mozo_id     uuid not null,
  chip_id     uuid references public.chips (id) on delete set null,
  canje_id    uuid references public.canjes (id) on delete set null,
  tipo        text not null check (tipo in ('suma', 'canje')),
  puntos      integer not null,
  origen      text not null check (origen in ('nfc', 'qr')),
  created_at  timestamptz not null default now(),
  foreign key (tarjeta_id, local_id) references public.tarjetas (id, local_id) on delete cascade,
  foreign key (mozo_id, local_id) references public.mozos (id, local_id),
  constraint movimientos_signo check (
    (tipo = 'suma' and puntos > 0) or (tipo = 'canje' and puntos < 0)
  ),
  constraint movimientos_canje check ((tipo = 'canje') = (canje_id is not null))
);
create index movimientos_tarjeta_idx on public.movimientos (tarjeta_id, created_at desc);
create index movimientos_local_idx on public.movimientos (local_id, created_at desc);
create index movimientos_mozo_idx on public.movimientos (mozo_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Dispositivos del cliente (cookie httpOnly con token; guardamos sólo el hash)
-- -----------------------------------------------------------------------------
create table public.dispositivos (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references public.clientes (id) on delete cascade,
  token_hash   text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  user_agent   text,
  created_at   timestamptz not null default now(),
  ultimo_uso   timestamptz not null default now(),
  revocado_en  timestamptz
);
create index dispositivos_cliente_idx on public.dispositivos (cliente_id);

-- -----------------------------------------------------------------------------
-- Tokens QR ya usados (anti-replay del QR de respaldo, un solo uso)
-- -----------------------------------------------------------------------------
create table public.qr_usados (
  jti        text primary key,
  expira_en  timestamptz not null,
  usado_en   timestamptz not null default now()
);
create index qr_usados_expira_idx on public.qr_usados (expira_en);

-- -----------------------------------------------------------------------------
-- Wallet (Apple / Google): PREPARADO, SIN IMPLEMENTAR.
-- Registro de dispositivos que siguen un pase, para mandar push de actualización.
-- -----------------------------------------------------------------------------
create table public.wallet_registros (
  id                 uuid primary key default gen_random_uuid(),
  tarjeta_id         uuid not null references public.tarjetas (id) on delete cascade,
  plataforma         text not null check (plataforma in ('apple', 'google')),
  device_library_id  text,
  push_token         text,
  created_at         timestamptz not null default now(),
  unique (tarjeta_id, plataforma, device_library_id)
);
