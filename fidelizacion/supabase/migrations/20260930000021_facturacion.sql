-- =============================================================================
-- Facturación de Point: comercios, planes, suscripciones (Mercado Pago),
-- productos (kit de chips), pedidos, pagos y el log crudo de webhooks.
--
-- Ideas que atraviesan todo el esquema (ver LEARNING.md, fase 1):
--  * La plata se guarda en CENTAVOS (integer). Nunca float: 0.1 + 0.2 != 0.3.
--    Se convierte a pesos sólo al hablar con Mercado Pago.
--  * Los ids de Mercado Pago son UNIQUE: si un webhook llega dos veces, el
--    segundo insert choca y no se duplica un cobro (idempotencia por constraint).
--  * El navegador nunca escribe estas tablas: todo cambio pasa por el servidor
--    (service_role) o por funciones security definer. RLS sólo abre lecturas.
--  * El "estado de la cuenta" no se guarda en comercios: se deriva de la
--    suscripción vigente (una sola fuente de verdad, nada que se desincronice).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Configuración global (una sola fila)
-- -----------------------------------------------------------------------------
create table public.config_facturacion (
  id                      boolean primary key default true check (id),
  costo_envio_centavos    integer not null default 500000 check (costo_envio_centavos >= 0),
  minutos_reserva_stock   integer not null default 30 check (minutos_reserva_stock between 5 and 1440),
  -- Morosidad: primero gracia (todo normal + aviso), después panel restringido
  -- pero sumar puntos sigue N días más, recién ahí se pausa el sumar.
  dias_gracia             integer not null default 10 check (dias_gracia between 0 and 60),
  dias_sumar_tras_gracia  integer not null default 7 check (dias_sumar_tras_gracia between 0 and 60),
  direccion_retiro        text not null default 'Cañada de Gómez (dirección a confirmar)'
                            check (char_length(direccion_retiro) between 3 and 200),
  updated_at              timestamptz not null default now()
);
insert into public.config_facturacion default values;

-- -----------------------------------------------------------------------------
-- Comercios: la cuenta que le paga a Point. Tiene uno o más locales (sucursales).
-- -----------------------------------------------------------------------------
create table public.comercios (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null check (char_length(btrim(nombre)) between 2 and 80),
  rubro              text check (rubro is null or char_length(rubro) <= 80),
  -- Quien se registró (o a quien se lo asignó el superadmin). Null si el
  -- superadmin lo creó sin dueño todavía.
  owner_user_id      uuid references auth.users (id) on delete set null,
  email_facturacion  text check (email_facturacion is null or email_facturacion ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  -- Datos fiscales opcionales: quedan listos para la factura electrónica.
  razon_social       text check (razon_social is null or char_length(razon_social) between 2 and 120),
  cuit               text check (cuit is null or cuit ~ '^[0-9]{11}$'),
  condicion_fiscal   text check (condicion_fiscal in ('monotributo', 'responsable_inscripto', 'exento')),
  origen             text not null default 'registro' check (origen in ('registro', 'admin', 'migracion')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index comercios_owner on public.comercios (owner_user_id);

-- Cada local existente pasa a ser la única sucursal de su propio comercio.
alter table public.locales add column comercio_id uuid references public.comercios (id) on delete restrict;
do $$
declare
  l record;
  v_comercio uuid;
begin
  for l in select id, nombre, rubro from public.locales where comercio_id is null loop
    insert into public.comercios (nombre, rubro, owner_user_id, origen)
    values (
      l.nombre, l.rubro,
      (select m.user_id from public.miembros_local m where m.local_id = l.id order by m.created_at limit 1),
      'migracion'
    )
    returning id into v_comercio;
    update public.locales set comercio_id = v_comercio where id = l.id;
  end loop;
end $$;
alter table public.locales alter column comercio_id set not null;
create index locales_comercio on public.locales (comercio_id);

-- -----------------------------------------------------------------------------
-- Planes (precios y límites en la base; se sincronizan con preapproval_plan de MP)
-- -----------------------------------------------------------------------------
create table public.planes (
  id                      uuid primary key default gen_random_uuid(),
  codigo                  text not null unique check (codigo ~ '^[a-z0-9_]{2,30}$'),
  nombre                  text not null check (char_length(btrim(nombre)) between 2 and 40),
  descripcion             text check (descripcion is null or char_length(descripcion) <= 200),
  precio_centavos         integer not null check (precio_centavos >= 0),
  moneda                  text not null default 'ARS' check (moneda = 'ARS'),
  -- {locales, clientes, premios: número o null = ilimitado; promos, mensajes: bool;
  --  estadisticas: 'basicas' | 'avanzadas'}. El servidor lo valida al leerlo.
  limites                 jsonb not null check (jsonb_typeof(limites) = 'object'),
  dias_prueba             integer not null default 14 check (dias_prueba between 0 and 90),
  mp_preapproval_plan_id  text unique,
  activo                  boolean not null default true,
  orden                   integer not null default 0,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

insert into public.planes (codigo, nombre, descripcion, precio_centavos, limites, dias_prueba, orden) values
  ('basico', 'Básico', 'Para arrancar con un local.', 1500000,
   '{"locales": 1, "clientes": 300, "premios": 3, "promos": false, "mensajes": false, "estadisticas": "basicas"}', 14, 1),
  ('pro', 'Pro', 'Para crecer y fidelizar en serio.', 3000000,
   '{"locales": 3, "clientes": null, "premios": null, "promos": true, "mensajes": true, "estadisticas": "avanzadas"}', 14, 2);

-- -----------------------------------------------------------------------------
-- Suscripciones
-- -----------------------------------------------------------------------------
create table public.suscripciones (
  id                  uuid primary key default gen_random_uuid(),
  comercio_id         uuid not null references public.comercios (id) on delete cascade,
  plan_id             uuid not null references public.planes (id),
  -- cortesia: plan asignado por Point, sin cobro ni suscripción en MP.
  -- trialing → authorized (cobrando) → past_due (cobro fallido) → ... → cancelled.
  estado              text not null check (estado in ('cortesia', 'trialing', 'pending', 'authorized', 'paused', 'past_due', 'cancelled')),
  mp_preapproval_id   text unique,
  mp_payer_email      text,
  -- Lo que paga hoy (puede diferir del precio de lista si el plan cambió de precio).
  precio_centavos     integer check (precio_centavos is null or precio_centavos >= 0),
  trial_ends_at       timestamptz,
  current_period_end  timestamptz,
  -- Cortesía: hasta cuándo (null = sin fecha de fin).
  cortesia_hasta      timestamptz,
  cancel_at_period_end boolean not null default false,
  -- Downgrade programado: se aplica al terminar el período pago.
  plan_programado_id  uuid references public.planes (id),
  past_due_desde      timestamptz,
  cancelada_en        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- Toda suscripción paga existe en MP; la cortesía nunca.
  check (estado in ('cortesia', 'cancelled') or mp_preapproval_id is not null),
  check (estado <> 'cortesia' or mp_preapproval_id is null),
  check (estado <> 'past_due' or past_due_desde is not null)
);
-- Un comercio tiene como máximo UNA suscripción vigente (las canceladas quedan de historial).
create unique index suscripciones_una_vigente on public.suscripciones (comercio_id) where estado <> 'cancelled';
create index suscripciones_estado on public.suscripciones (estado);

-- Cada cuota mensual. MP la llama "authorized payment" (factura); cuando se
-- intenta cobrar genera un "payment". Ambos ids son únicos.
create table public.pagos_suscripcion (
  id                        uuid primary key default gen_random_uuid(),
  suscripcion_id            uuid not null references public.suscripciones (id) on delete cascade,
  mp_authorized_payment_id  text not null unique,
  mp_payment_id             text unique,
  monto_centavos            integer not null check (monto_centavos >= 0),
  -- Estado de la cuota en MP (scheduled, processed, recycling, cancelled...) y del pago.
  estado                    text not null,
  estado_pago               text,
  status_detail             text,
  intento                   integer not null default 0 check (intento >= 0),
  fecha_debito              timestamptz,
  fecha_pago                timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index pagos_suscripcion_susc on public.pagos_suscripcion (suscripcion_id, fecha_debito desc);

-- Auditoría: cada cambio de estado o de plan, con quién lo originó.
create table public.historial_suscripcion (
  id              bigint generated always as identity primary key,
  suscripcion_id  uuid not null references public.suscripciones (id) on delete cascade,
  de_estado       text,
  a_estado        text not null,
  de_plan_id      uuid references public.planes (id),
  a_plan_id       uuid references public.planes (id),
  motivo          text,
  origen          text not null check (origen in ('webhook', 'cron', 'panel', 'admin', 'sistema')),
  actor           uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now()
);
create index historial_suscripcion_susc on public.historial_suscripcion (suscripcion_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Productos y pedidos (kit de chips NFC, Checkout Pro)
-- -----------------------------------------------------------------------------
create table public.productos (
  id                uuid primary key default gen_random_uuid(),
  codigo            text not null unique check (codigo ~ '^[a-z0-9_]{2,30}$'),
  nombre            text not null check (char_length(btrim(nombre)) between 2 and 60),
  descripcion       text check (descripcion is null or char_length(descripcion) <= 200),
  precio_centavos   integer not null check (precio_centavos > 0),
  chips_por_unidad  integer not null default 1 check (chips_por_unidad > 0),
  -- Stock disponible (ya descontadas las reservas vigentes).
  stock             integer not null default 0 check (stock >= 0),
  max_por_pedido    integer not null default 10 check (max_por_pedido > 0),
  activo            boolean not null default true,
  orden             integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

insert into public.productos (codigo, nombre, descripcion, precio_centavos, chips_por_unidad, stock, max_por_pedido, orden) values
  ('kit_inicial', 'Kit inicial', '10 chips NFC listos para usar.', 2500000, 10, 5, 3, 1),
  ('chip', 'Chip adicional', 'Un chip NFC más para tu equipo.', 300000, 1, 50, 30, 2);

create table public.pedidos (
  id                    uuid primary key default gen_random_uuid(),
  numero                bigint generated always as identity (start with 1001) unique,
  comercio_id           uuid not null references public.comercios (id) on delete restrict,
  estado                text not null default 'pendiente_pago' check (estado in (
                          'pendiente_pago', 'pagado', 'preparando', 'enviado', 'listo_retiro',
                          'entregado', 'expirado', 'cancelado', 'reembolsado')),
  entrega               text not null check (entrega in ('envio', 'retiro')),
  direccion             jsonb check (direccion is null or jsonb_typeof(direccion) = 'object'),
  -- Montos calculados en el servidor desde la base (nunca desde el navegador).
  subtotal_centavos     integer not null check (subtotal_centavos >= 0),
  costo_envio_centavos  integer not null default 0 check (costo_envio_centavos >= 0),
  total_centavos        integer not null check (total_centavos = subtotal_centavos + costo_envio_centavos),
  mp_preference_id      text unique,
  -- Mientras está pendiente de pago, el stock queda reservado hasta esta hora.
  reserva_hasta         timestamptz,
  pagado_en             timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (entrega <> 'envio' or direccion is not null)
);
create index pedidos_comercio on public.pedidos (comercio_id, created_at desc);
create index pedidos_reservas on public.pedidos (reserva_hasta) where estado = 'pendiente_pago';

create table public.pedido_items (
  pedido_id                 uuid not null references public.pedidos (id) on delete cascade,
  producto_id               uuid not null references public.productos (id),
  cantidad                  integer not null check (cantidad > 0),
  -- Precio congelado al momento de la compra (si después cambia, el pedido no).
  precio_unitario_centavos  integer not null check (precio_unitario_centavos > 0),
  primary key (pedido_id, producto_id)
);

-- Pagos únicos (Checkout Pro). Un pedido puede tener varios intentos de pago.
create table public.pagos (
  id                    uuid primary key default gen_random_uuid(),
  pedido_id             uuid references public.pedidos (id) on delete set null,
  mp_payment_id         text not null unique,
  estado                text not null,
  status_detail         text,
  monto_centavos        integer not null check (monto_centavos >= 0),
  reembolsado_centavos  integer not null default 0 check (reembolsado_centavos >= 0),
  medio                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index pagos_pedido on public.pagos (pedido_id);

-- -----------------------------------------------------------------------------
-- Log crudo de TODOS los webhooks (firma válida o no). Sin UNIQUE a propósito:
-- se guarda cada entrega tal como llegó; la idempotencia está en las tablas de
-- negocio. Sirve para auditar, depurar y "reprocesar" desde /admin.
-- -----------------------------------------------------------------------------
create table public.eventos_pago (
  id             bigint generated always as identity primary key,
  topic          text,
  action         text,
  data_id        text,
  x_request_id   text,
  firma_valida   boolean not null,
  raw            jsonb not null,
  procesado_en   timestamptz,
  error          text,
  intentos       integer not null default 0,
  created_at     timestamptz not null default now()
);
create index eventos_pago_recurso on public.eventos_pago (topic, data_id);
create index eventos_pago_pendientes on public.eventos_pago (created_at) where procesado_en is null;

-- Avisos dentro del panel del comercio (después se enchufa el envío por email).
create table public.avisos_comercio (
  id           bigint generated always as identity primary key,
  comercio_id  uuid not null references public.comercios (id) on delete cascade,
  tipo         text not null,
  titulo       text not null,
  texto        text not null,
  leido_en     timestamptz,
  created_at   timestamptz not null default now()
);
create index avisos_comercio_idx on public.avisos_comercio (comercio_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Cortesía para los comercios que ya existían: plan Pro, sin cobro y sin fin.
-- -----------------------------------------------------------------------------
insert into public.suscripciones (comercio_id, plan_id, estado)
select c.id, (select id from public.planes where codigo = 'pro'), 'cortesia'
from public.comercios c
where c.origen = 'migracion';

insert into public.historial_suscripcion (suscripcion_id, a_estado, a_plan_id, motivo, origen)
select s.id, s.estado, s.plan_id, 'Comercio existente antes de la facturación', 'sistema'
from public.suscripciones s;

-- -----------------------------------------------------------------------------
-- updated_at automático
-- -----------------------------------------------------------------------------
create or replace function public.tocar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['config_facturacion', 'comercios', 'planes', 'suscripciones', 'pagos_suscripcion', 'productos', 'pedidos', 'pagos'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.tocar_updated_at()', t || '_updated_at', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
-- ¿El usuario actual gestiona este comercio? (dueño registrado o dueño de alguno de sus locales)
create or replace function public.gestiona_comercio(p_comercio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.es_superadmin()
    or exists (select 1 from public.comercios c where c.id = p_comercio_id and c.owner_user_id = (select auth.uid()))
    or exists (
      select 1 from public.locales l
      join public.miembros_local m on m.local_id = l.id
      where l.comercio_id = p_comercio_id and m.user_id = (select auth.uid())
    );
$$;
revoke execute on function public.gestiona_comercio(uuid) from public, anon;
grant execute on function public.gestiona_comercio(uuid) to authenticated, service_role;
revoke execute on function public.tocar_updated_at() from public, anon, authenticated;

alter table public.config_facturacion enable row level security;
alter table public.comercios enable row level security;
alter table public.planes enable row level security;
alter table public.suscripciones enable row level security;
alter table public.pagos_suscripcion enable row level security;
alter table public.historial_suscripcion enable row level security;
alter table public.productos enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_items enable row level security;
alter table public.pagos enable row level security;
alter table public.eventos_pago enable row level security;
alter table public.avisos_comercio enable row level security;

-- Nadie escribe desde el navegador: sólo el servidor (service_role) o funciones.
revoke insert, update, delete, truncate on
  public.config_facturacion, public.comercios, public.planes, public.suscripciones,
  public.pagos_suscripcion, public.historial_suscripcion, public.productos, public.pedidos,
  public.pedido_items, public.pagos, public.eventos_pago, public.avisos_comercio
from anon, authenticated;
-- El log de webhooks es sólo del servidor (tiene payloads crudos).
revoke select on public.eventos_pago from anon, authenticated;
grant all on
  public.config_facturacion, public.comercios, public.planes, public.suscripciones,
  public.pagos_suscripcion, public.historial_suscripcion, public.productos, public.pedidos,
  public.pedido_items, public.pagos, public.eventos_pago, public.avisos_comercio
to service_role;

-- Catálogo público: la página de precios y la tienda de chips.
create policy config_facturacion_lectura on public.config_facturacion for select to anon, authenticated using (true);
create policy planes_publicos on public.planes for select to anon using (activo);
create policy planes_lectura on public.planes for select to authenticated using (activo or public.es_superadmin());
create policy productos_publicos on public.productos for select to anon using (activo);
create policy productos_lectura on public.productos for select to authenticated using (activo or public.es_superadmin());

-- Lo del comercio, sólo para quien lo gestiona.
create policy comercios_lectura on public.comercios for select to authenticated using (public.gestiona_comercio(id));
create policy suscripciones_lectura on public.suscripciones for select to authenticated using (public.gestiona_comercio(comercio_id));
create policy pagos_suscripcion_lectura on public.pagos_suscripcion for select to authenticated
  using (exists (select 1 from public.suscripciones s where s.id = suscripcion_id and public.gestiona_comercio(s.comercio_id)));
create policy historial_suscripcion_lectura on public.historial_suscripcion for select to authenticated
  using (exists (select 1 from public.suscripciones s where s.id = suscripcion_id and public.gestiona_comercio(s.comercio_id)));
create policy pedidos_lectura on public.pedidos for select to authenticated using (public.gestiona_comercio(comercio_id));
create policy pedido_items_lectura on public.pedido_items for select to authenticated
  using (exists (select 1 from public.pedidos p where p.id = pedido_id and public.gestiona_comercio(p.comercio_id)));
create policy pagos_lectura on public.pagos for select to authenticated
  using (exists (select 1 from public.pedidos p where p.id = pedido_id and public.gestiona_comercio(p.comercio_id)));
create policy avisos_comercio_lectura on public.avisos_comercio for select to authenticated using (public.gestiona_comercio(comercio_id));

-- -----------------------------------------------------------------------------
-- Alta de un comercio (registro propio o desde /admin), en una transacción.
-- Con p_cortesia_plan: queda en cortesía con ese plan (sin cobro, sin MP).
-- -----------------------------------------------------------------------------
create or replace function public.crear_comercio(
  p_nombre text,
  p_rubro text,
  p_owner uuid,
  p_origen text,
  p_cortesia_plan text default null,
  p_cortesia_hasta timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comercio uuid;
  v_plan uuid;
  v_susc uuid;
begin
  insert into public.comercios (nombre, rubro, owner_user_id, origen)
  values (btrim(p_nombre), nullif(btrim(coalesce(p_rubro, '')), ''), p_owner, p_origen)
  returning id into v_comercio;

  if p_cortesia_plan is not null then
    select id into v_plan from public.planes where codigo = p_cortesia_plan;
    if v_plan is null then
      raise exception 'plan inexistente: %', p_cortesia_plan using errcode = '22023';
    end if;
    insert into public.suscripciones (comercio_id, plan_id, estado, cortesia_hasta)
    values (v_comercio, v_plan, 'cortesia', p_cortesia_hasta)
    returning id into v_susc;
    insert into public.historial_suscripcion (suscripcion_id, a_estado, a_plan_id, motivo, origen, actor)
    values (v_susc, 'cortesia', v_plan, 'Cortesía al crear el comercio', 'admin', (select auth.uid()));
  end if;

  return v_comercio;
end;
$$;
revoke execute on function public.crear_comercio(text, text, uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.crear_comercio(text, text, uuid, text, text, timestamptz) to service_role;
