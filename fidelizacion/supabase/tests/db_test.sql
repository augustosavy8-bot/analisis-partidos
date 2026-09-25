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


-- ---------------------------------------------------------------- panel
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000002"}', false), set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
select pg_temp.check((public.panel_metricas('00000000-0000-4000-8000-000000000001')->>'clientes_total')::int = 2, 'panel_metricas cuenta clientes');
select pg_temp.check((public.panel_metricas('00000000-0000-4000-8000-000000000001')->>'canjes')::int = 1, 'panel_metricas cuenta canjes');
select pg_temp.check(jsonb_array_length(public.panel_metricas('00000000-0000-4000-8000-000000000001')->'visitas_por_dia') = 14, 'panel_metricas trae 14 días');
select pg_temp.check((select count(*) from public.panel_clientes('00000000-0000-4000-8000-000000000001')) = 2, 'panel_clientes lista los clientes del local');
select pg_temp.check((select nombre from public.panel_clientes('00000000-0000-4000-8000-000000000001', 'bet')) = 'Beto', 'panel_clientes busca por nombre');
select pg_temp.check((select nombre from public.panel_clientes('00000000-0000-4000-8000-000000000001', '0000001')) = 'Ana', 'panel_clientes busca por WhatsApp');
do $$ begin
  begin
    perform public.panel_metricas('00000000-0000-4000-8000-00000000000f');
    raise exception 'FALLÓ: dueño ve métricas de otro local';
  exception when insufficient_privilege then raise notice 'ok - panel_metricas rechaza otro local';
  end;
  begin
    perform * from public.panel_clientes('00000000-0000-4000-8000-00000000000f');
    raise exception 'FALLÓ: dueño ve clientes de otro local';
  exception when insufficient_privilege then raise notice 'ok - panel_clientes rechaza otro local';
  end;
end $$;
reset role;


-- ---------------------------------------------------------------- superadmin
insert into public.rechazos (local_id, motivo, origen) values ('00000000-0000-4000-8000-000000000001', 'qr_usado', 'qr'), (null, 'chip_invalido', 'nfc');
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001"}', false), set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', false);
select pg_temp.check((public.admin_resumen()->'totales'->>'locales')::int = 2, 'admin_resumen cuenta locales');
select pg_temp.check(jsonb_array_length(public.admin_resumen()->'rechazos_recientes') = 2, 'admin_resumen lista rechazos');
select pg_temp.check((select count(*) from public.rechazos) = 2, 'superadmin ve todos los rechazos');
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000002"}', false), set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
select pg_temp.check((select count(*) from public.rechazos) = 1, 'dueño ve sólo los rechazos de su local');
do $$ begin
  begin
    perform public.admin_resumen();
    raise exception 'FALLÓ: dueño ve el resumen de superadmin';
  exception when insufficient_privilege then raise notice 'ok - admin_resumen sólo para superadmin';
  end;
end $$;
reset role;


-- ---------------------------------------------------------------- eliminar cliente
insert into public.dispositivos (cliente_id, token_hash) values ('cccccccc-0000-4000-8000-000000000001', repeat('c', 64));
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000002"}', false), set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
do $$ begin
  begin
    perform public.eliminar_cliente_de_local('00000000-0000-4000-8000-00000000000f',
      (select id from public.clientes where whatsapp = '+5493410000002'));
    raise exception 'FALLÓ: dueño elimina cliente de otro local';
  exception when insufficient_privilege then raise notice 'ok - no puede eliminar clientes de otro local';
  end;
end $$;
select pg_temp.check(not (public.eliminar_cliente_de_local('00000000-0000-4000-8000-000000000001',
  (select id from public.clientes where whatsapp = '+5493410000002'))->>'cliente_borrado')::boolean,
  'cliente con tarjeta en otro local: se borra sólo la tarjeta de este local');
select pg_temp.check((public.eliminar_cliente_de_local('00000000-0000-4000-8000-000000000001',
  'cccccccc-0000-4000-8000-000000000001')->>'cliente_borrado')::boolean,
  'cliente sin otras tarjetas: se borra entero');
reset role;
select pg_temp.check((select count(*) from public.clientes where whatsapp = '+5493410000002') = 1
  and (select count(*) from public.tarjetas t join public.clientes c on c.id = t.cliente_id where c.whatsapp = '+5493410000002') = 1,
  'Beto sigue existiendo con su tarjeta del otro local');
select pg_temp.check((select count(*) from public.clientes where id = 'cccccccc-0000-4000-8000-000000000001') = 0
  and (select count(*) from public.dispositivos where cliente_id = 'cccccccc-0000-4000-8000-000000000001') = 0
  and (select count(*) from public.movimientos where tarjeta_id = 'dddddddd-0000-4000-8000-000000000001') = 0,
  'Ana: se borraron datos, celulares y movimientos');

-- ---------------------------------------------------------------- beneficios (bienvenida, cumple, promos)
update public.locales set puntos_bienvenida = 3, puntos_cumple = 5 where id = '00000000-0000-4000-8000-000000000001';
insert into public.clientes (id, nombre, whatsapp, consentimiento, cumple_dia, cumple_mes, cumple_cargado_en)
select 'cccccccc-0000-4000-8000-000000000005', 'Caro', '+5493410000005', true,
       extract(day from now() at time zone 'America/Argentina/Buenos_Aires'),
       extract(month from now() at time zone 'America/Argentina/Buenos_Aires'), now() - interval '40 days';
insert into public.clientes (id, nombre, whatsapp, consentimiento, cumple_dia, cumple_mes, cumple_cargado_en)
select 'cccccccc-0000-4000-8000-000000000006', 'Dani', '+5493410000006', true,
       extract(day from now() at time zone 'America/Argentina/Buenos_Aires'),
       extract(month from now() at time zone 'America/Argentina/Buenos_Aires'), now();
insert into public.tarjetas (id, cliente_id, local_id) values
  ('dddddddd-0000-4000-8000-000000000005', 'cccccccc-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001'),
  ('dddddddd-0000-4000-8000-000000000006', 'cccccccc-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001');

do $$ begin
  begin
    update public.clientes set cumple_dia = 30, cumple_mes = 2 where id = 'cccccccc-0000-4000-8000-000000000006';
    raise exception 'FALLÓ: aceptó 30 de febrero';
  exception when check_violation then raise notice 'ok - cumple inválido rechazado';
  end;
end $$;
select pg_temp.check(public.fecha_cumple(2027, 2, 29) = '2027-02-28' and public.fecha_cumple(2028, 2, 29) = '2028-02-29',
  'el 29/2 cae el 28/2 en años no bisiestos');

select public.registrar_suma('dddddddd-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000101', null, 'qr') as r \gset
select pg_temp.check((:'r'::jsonb->>'puntos')::int = 9 and jsonb_array_length(:'r'::jsonb->'regalos') = 2,
  'primera visita en la semana del cumple: 1 + 3 de bienvenida + 5 de cumple');
select pg_temp.check((select count(*) from public.movimientos where tarjeta_id = 'dddddddd-0000-4000-8000-000000000005' and tipo = 'regalo') = 2,
  'los regalos quedan en movimientos');

update public.movimientos set created_at = created_at - interval '1 hour' where tarjeta_id = 'dddddddd-0000-4000-8000-000000000005';
select public.registrar_suma('dddddddd-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000101', null, 'qr') as r \gset
select pg_temp.check((:'r'::jsonb->>'puntos')::int = 10 and jsonb_array_length(:'r'::jsonb->'regalos') = 0,
  'segunda visita: sin bienvenida ni cumple repetidos');

select public.registrar_suma('dddddddd-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000101', null, 'qr') as r \gset
select pg_temp.check((:'r'::jsonb->>'puntos')::int = 4,
  'cumple cargado recién: no hay regalo de cumple (sí bienvenida)');

insert into public.promos (local_id, nombre, dias, desde, hasta, puntos)
values ('00000000-0000-4000-8000-000000000001', 'Puntos dobles', array[0,1,2,3,4,5,6], '00:00', '23:59:59.999', 2);
update public.movimientos set created_at = created_at - interval '1 hour' where tarjeta_id = 'dddddddd-0000-4000-8000-000000000005';
select public.registrar_suma('dddddddd-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000101', null, 'qr') as r \gset
select pg_temp.check((:'r'::jsonb->>'sumados')::int = 2 and :'r'::jsonb->>'promo' = 'Puntos dobles' and (:'r'::jsonb->>'puntos')::int = 12,
  'promo vigente: el toque suma 2');
update public.promos set activa = false;
update public.movimientos set created_at = created_at - interval '1 hour' where tarjeta_id = 'dddddddd-0000-4000-8000-000000000005';
select pg_temp.check((public.registrar_suma('dddddddd-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000101', null, 'qr')->>'sumados')::int = 1,
  'promo pausada: vuelve a sumar 1');

-- ---------------------------------------------------------------- reactivar por WhatsApp
update public.movimientos set created_at = created_at - interval '40 days' where tarjeta_id = 'dddddddd-0000-4000-8000-000000000005';
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000002"}', false), set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
select pg_temp.check((select count(*) from public.panel_reactivar('00000000-0000-4000-8000-000000000001', 'inactivos', 30)
  where nombre = 'Caro') = 1, 'inactivos: Caro no viene hace 40 días');
select pg_temp.check((select count(*) from public.panel_reactivar('00000000-0000-4000-8000-000000000001', 'inactivos', 30)
  where nombre = 'Dani') = 0, 'inactivos: Dani vino hoy');
select pg_temp.check((select premio_nombre from public.panel_reactivar('00000000-0000-4000-8000-000000000001', 'premio', 0)
  where nombre = 'Caro') = 'Café + medialuna', 'premio: Caro (13 pts) alcanza Café + medialuna');
select pg_temp.check((select count(*) from public.panel_reactivar('00000000-0000-4000-8000-000000000001', 'cerca', 4)
  where nombre = 'Dani') = 1, 'cerca: a Dani (4 pts) le faltan 4 para Café gratis');
select pg_temp.check((select count(*) from public.panel_reactivar('00000000-0000-4000-8000-000000000001', 'cumple', 7)) = 2,
  'cumple: Caro y Dani cumplen esta semana');
insert into public.contactos_whatsapp (local_id, cliente_id, segmento)
values ('00000000-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000000005', 'inactivos');
select pg_temp.check((select ultimo_contacto from public.panel_reactivar('00000000-0000-4000-8000-000000000001', 'inactivos', 30)
  where nombre = 'Caro') is not null, 'se registra el último mensaje enviado');
update public.tarjetas set no_contactar = true where id = 'dddddddd-0000-4000-8000-000000000006';
select pg_temp.check((select no_contactar from public.tarjetas where id = 'dddddddd-0000-4000-8000-000000000006'),
  'el dueño marca "no contactar"');
do $$ begin
  begin
    insert into public.contactos_whatsapp (local_id, cliente_id, segmento)
    values ('00000000-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000000006', 'cumple');
    raise exception 'FALLÓ: registró mensaje a quien pidió no ser contactado';
  exception when insufficient_privilege then raise notice 'ok - no se registran mensajes a "no contactar"';
  end;
  begin
    perform * from public.panel_reactivar('00000000-0000-4000-8000-00000000000f', 'inactivos', 30);
    raise exception 'FALLÓ: dueño ve segmentos de otro local';
  exception when insufficient_privilege then raise notice 'ok - panel_reactivar rechaza otro local';
  end;
  begin
    insert into public.promos (local_id, nombre, dias, desde, hasta, puntos)
    values ('00000000-0000-4000-8000-00000000000f', 'X', array[1], '10:00', '12:00', 2);
    raise exception 'FALLÓ: dueño crea promo en otro local';
  exception when insufficient_privilege then raise notice 'ok - no puede crear promos en otro local';
  end;
end $$;
select pg_temp.check((select count(*) from public.promos) = 1, 'el dueño ve las promos de su local');
reset role;

-- ---------------------------------------------------------------- canje al toque
update public.tarjetas set puntos = 10 where id = 'dddddddd-0000-4000-8000-000000000006';
select pg_temp.check((public.canjear_con_toque('dddddddd-0000-4000-8000-000000000006',
  (select id from public.premios where nombre = 'Café gratis'))->>'motivo') = 'sin_toque',
  'canje al toque: sin toque reciente no canjea');
select public.marcar_toque('dddddddd-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000101', null, 'nfc');
select public.canjear_con_toque('dddddddd-0000-4000-8000-000000000006',
  (select id from public.premios where nombre = 'Café gratis')) as r \gset
select pg_temp.check((:'r'::jsonb->>'ok')::boolean and (:'r'::jsonb->>'puntos')::int = 2,
  'canje al toque: con toque reciente canjea y descuenta (10 -> 2)');
select pg_temp.check((select count(*) from public.movimientos m join public.canjes c on c.id = m.canje_id
  where m.tarjeta_id = 'dddddddd-0000-4000-8000-000000000006' and c.estado = 'confirmado'
    and m.mozo_id = '00000000-0000-4000-8000-000000000101') = 1,
  'canje al toque: queda el canje confirmado con el mozo del toque');
update public.tarjetas set puntos = 10 where id = 'dddddddd-0000-4000-8000-000000000006';
select pg_temp.check((public.canjear_con_toque('dddddddd-0000-4000-8000-000000000006',
  (select id from public.premios where nombre = 'Café gratis'))->>'motivo') = 'sin_toque',
  'canje al toque: un toque sirve para un solo canje');
select public.marcar_toque('dddddddd-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000101', null, 'nfc');
update public.tarjetas set ultimo_toque_en = now() - interval '6 minutes' where id = 'dddddddd-0000-4000-8000-000000000006';
select pg_temp.check((public.canjear_con_toque('dddddddd-0000-4000-8000-000000000006',
  (select id from public.premios where nombre = 'Café gratis'))->>'motivo') = 'sin_toque',
  'canje al toque: un toque de hace más de 5 minutos no sirve');

\echo 'TODOS LOS TESTS DE BASE PASARON'
