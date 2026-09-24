-- Tests de base: RLS, privilegios por columna y funciones antifraude.
\set ON_ERROR_STOP on
\set QUIET on

create or replace function pg_temp.check(cond boolean, msg text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'FALLÓ: %', msg; end if;
  raise notice 'ok - %', msg;
end $$;

-- Datos: un segundo local, usuarios de panel, un cliente con tarjeta.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'super@test'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'dueno.aurora@test'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'dueno.otro@test');
insert into public.superadmins values ('aaaaaaaa-0000-4000-8000-000000000001');
insert into public.locales (id, slug, nombre) values ('00000000-0000-4000-8000-00000000000f', 'otro-bar', 'Otro Bar');
insert into public.mozos (id, local_id, nombre) values ('00000000-0000-4000-8000-0000000001ff', '00000000-0000-4000-8000-00000000000f', 'Mozo Otro');
insert into public.miembros_local (user_id, local_id) values
  ('aaaaaaaa-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001'),
  ('aaaaaaaa-0000-4000-8000-000000000003', '00000000-0000-4000-8000-00000000000f');
insert into public.clientes (id, nombre, whatsapp, consentimiento)
  values ('cccccccc-0000-4000-8000-000000000001', 'Ana', '+5493410000001', true);
insert into public.tarjetas (id, cliente_id, local_id)
  values ('dddddddd-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001');

-- ---------------------------------------------------------------- integridad
do $$ begin
  begin
    insert into public.movimientos (tarjeta_id, local_id, mozo_id, tipo, puntos, origen)
    values ('dddddddd-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
            '00000000-0000-4000-8000-0000000001ff', 'suma', 1, 'nfc');
    raise exception 'FALLÓ: permitió movimiento con mozo de otro local';
  exception when foreign_key_violation then raise notice 'ok - FK compuesta impide mozo de otro local';
  end;
  begin
    insert into public.clientes (nombre, whatsapp, consentimiento) values ('X', '+5493410000009', false);
    raise exception 'FALLÓ: permitió cliente sin consentimiento';
  exception when check_violation then raise notice 'ok - consentimiento obligatorio';
  end;
  begin
    insert into public.chips (uid, local_id, modo) values ('04AA', '00000000-0000-4000-8000-000000000001', 'produccion');
    raise exception 'FALLÓ: chip de producción sin clave';
  exception when check_violation then raise notice 'ok - chip de producción exige clave';
  end;
end $$;

-- ---------------------------------------------------------------- funciones
select pg_temp.check((public.registrar_suma('dddddddd-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201', 'nfc')->>'ok')::boolean,
  'registrar_suma suma el primer punto');
select pg_temp.check((public.registrar_suma('dddddddd-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000101', null, 'nfc')->>'motivo') = 'limite',
  'registrar_suma respeta el límite de N minutos');
select pg_temp.check((public.registrar_suma('dddddddd-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-0000000001ff', null, 'nfc')->>'motivo') = 'mozo_invalido',
  'registrar_suma rechaza mozo de otro local');

select pg_temp.check(public.consumir_contador_chip('00000000-0000-4000-8000-000000000201', 5), 'contador 5 aceptado');
select pg_temp.check(not public.consumir_contador_chip('00000000-0000-4000-8000-000000000201', 5), 'contador 5 repetido rechazado');
select pg_temp.check(not public.consumir_contador_chip('00000000-0000-4000-8000-000000000201', 3), 'contador menor rechazado');
select pg_temp.check(public.consumir_contador_chip('00000000-0000-4000-8000-000000000201', 6), 'contador 6 aceptado');

select pg_temp.check(public.consumir_qr('jti-1', now() + interval '30 seconds'), 'QR nuevo aceptado');
select pg_temp.check(not public.consumir_qr('jti-1', now() + interval '30 seconds'), 'QR reusado rechazado');

-- Canje: sin puntos suficientes, luego con puntos.
select pg_temp.check((public.solicitar_canje('dddddddd-0000-4000-8000-000000000001',
  (select id from public.premios where nombre = 'Café gratis'))->>'motivo') = 'puntos_insuficientes',
  'solicitar_canje exige puntos');
update public.tarjetas set puntos = 9 where id = 'dddddddd-0000-4000-8000-000000000001';
select (public.solicitar_canje('dddddddd-0000-4000-8000-000000000001',
  (select id from public.premios where nombre = 'Café gratis'))->>'canje_id') as canje_id \gset
select pg_temp.check((public.confirmar_canje(:'canje_id', '00000000-0000-4000-8000-000000000102', null, 'qr')->>'puntos')::int = 1,
  'confirmar_canje descuenta 8 puntos (9 -> 1)');
select pg_temp.check((public.confirmar_canje(:'canje_id', '00000000-0000-4000-8000-000000000102', null, 'qr')->>'motivo') = 'canje_no_pendiente',
  'confirmar_canje no se puede repetir');
select pg_temp.check((select count(*) from public.movimientos where tipo = 'canje' and puntos = -8) = 1,
  'el canje quedó en movimientos');


-- ---------------------------------------------------------------- alta de clientes
select (public.alta_cliente('Beto', '+5493410000002', '00000000-0000-4000-8000-000000000001',
  repeat('a', 64), 'test')) as alta \gset
select pg_temp.check(not (:'alta'::jsonb->>'cliente_existia')::boolean, 'alta_cliente crea cliente nuevo');
select pg_temp.check((select count(*) from public.tarjetas t join public.clientes c on c.id = t.cliente_id where c.whatsapp = '+5493410000002') = 1,
  'alta_cliente crea la tarjeta');
select (public.alta_cliente('Otro nombre', '+5493410000002', '00000000-0000-4000-8000-00000000000f',
  repeat('b', 64), 'test')) as alta2 \gset
select pg_temp.check((:'alta2'::jsonb->>'cliente_existia')::boolean
  and (:'alta2'::jsonb->>'cliente_id') = (:'alta'::jsonb->>'cliente_id'),
  'alta_cliente reutiliza el cliente por WhatsApp');
select pg_temp.check((select nombre from public.clientes where whatsapp = '+5493410000002') = 'Beto',
  'alta_cliente no pisa el nombre existente');
select pg_temp.check((select count(*) from public.tarjetas t join public.clientes c on c.id = t.cliente_id where c.whatsapp = '+5493410000002') = 2,
  'alta_cliente crea tarjeta en el segundo local');
select pg_temp.check(public.asegurar_tarjeta((:'alta'::jsonb->>'cliente_id')::uuid, '00000000-0000-4000-8000-000000000001')
  = (:'alta'::jsonb->>'tarjeta_id')::uuid, 'asegurar_tarjeta es idempotente');

-- ---------------------------------------------------------------- RLS
set role anon;
do $$ begin
  begin
    perform 1 from public.locales;
    raise exception 'FALLÓ: anon puede leer locales';
  exception when insufficient_privilege then raise notice 'ok - anon no lee locales';
  end;
  begin
    perform public.registrar_suma(null, null, null, 'nfc');
    raise exception 'FALLÓ: anon ejecuta registrar_suma';
  exception when insufficient_privilege then raise notice 'ok - anon no ejecuta registrar_suma';
  end;
end $$;
reset role;

-- Dueño de Café Aurora
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000002"}', false), set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
select pg_temp.check((select count(*) from public.locales) = 1, 'dueño ve sólo su local');
select pg_temp.check((select count(*) from public.clientes) = 2, 'dueño ve sus clientes');
select pg_temp.check((select count(*) from public.movimientos) = 2, 'dueño ve movimientos de su local');
select pg_temp.check((select count(*) from public.mozos) = 2, 'dueño ve sus mozos');
do $$ begin
  begin
    perform clave_aes_cifrada from public.chips;
    raise exception 'FALLÓ: dueño lee claves de chips';
  exception when insufficient_privilege then raise notice 'ok - dueño no lee claves de chips';
  end;
  begin
    perform pin_hash from public.mozos;
    raise exception 'FALLÓ: dueño lee hashes de PIN';
  exception when insufficient_privilege then raise notice 'ok - dueño no lee hashes de PIN';
  end;
  begin
    update public.tarjetas set puntos = 999;
    raise exception 'FALLÓ: dueño edita puntos';
  exception when insufficient_privilege then raise notice 'ok - dueño no edita puntos a mano';
  end;
  begin
    insert into public.premios (local_id, nombre, puntos_necesarios) values ('00000000-0000-4000-8000-00000000000f', 'Robo', 1);
    raise exception 'FALLÓ: dueño crea premio en otro local';
  exception when insufficient_privilege then raise notice 'ok - dueño no crea premios en otro local';
  end;
end $$;
update public.locales set minutos_entre_puntos = 60 where slug = 'cafe-aurora';
select pg_temp.check((select minutos_entre_puntos from public.locales where slug = 'cafe-aurora') = 60, 'dueño edita la regla de puntos');
insert into public.premios (local_id, nombre, puntos_necesarios) values ('00000000-0000-4000-8000-000000000001', 'Torta', 15);
select pg_temp.check(true, 'dueño crea premio en su local');
update public.locales set nombre = 'hack' where slug = 'otro-bar';
reset role;
select pg_temp.check((select nombre from public.locales where slug = 'otro-bar') = 'Otro Bar', 'dueño no edita otro local');

-- Dueño de otro local
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000003"}', false), set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000003', false);
select pg_temp.check((select count(*) from public.clientes) = 1, 'otro dueño ve sólo sus clientes (Beto), no a Ana');
select pg_temp.check((select count(*) from public.tarjetas) = 1, 'otro dueño ve sólo las tarjetas de su local');
select pg_temp.check((select count(*) from public.chips) = 0, 'otro dueño no ve chips ajenos');

-- Superadmin
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001"}', false), set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', false);
select pg_temp.check((select count(*) from public.locales) = 2, 'superadmin ve todos los locales');
select pg_temp.check((select count(*) from public.clientes) = 2, 'superadmin ve todos los clientes');
reset role;

\echo 'TODOS LOS TESTS DE BASE PASARON'
