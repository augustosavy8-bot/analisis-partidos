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
insert into public.comercios (id, nombre, origen) values ('00000000-0000-4000-8000-0000000000cf', 'Otro Bar', 'admin');
insert into public.locales (id, slug, nombre, comercio_id) values ('00000000-0000-4000-8000-00000000000f', 'otro-bar', 'Otro Bar', '00000000-0000-4000-8000-0000000000cf');
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

-- ---------------------------------------------------------------- aplicar_toque (una sola llamada)
update public.locales set minutos_entre_puntos = 0 where id = '00000000-0000-4000-8000-000000000001';
update public.tarjetas set puntos = 0, ultimo_toque_en = null where id = 'dddddddd-0000-4000-8000-000000000006';
select public.aplicar_toque('cccccccc-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000101', null, 'nfc') as r \gset
select pg_temp.check(:'r'::jsonb->>'tipo' = 'suma' and :'r'::jsonb->>'serial' is not null
  and (select ultimo_toque_en is not null from public.tarjetas where id = 'dddddddd-0000-4000-8000-000000000006'),
  'aplicar_toque suma, devuelve el serial y marca el toque');
update public.tarjetas set puntos = 20 where id = 'dddddddd-0000-4000-8000-000000000006';
select public.solicitar_canje('dddddddd-0000-4000-8000-000000000006', (select id from public.premios where nombre = 'Café gratis'));
select pg_temp.check(public.aplicar_toque('cccccccc-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000101', null, 'nfc')->>'tipo' = 'canje',
  'aplicar_toque confirma el canje pendiente');
select pg_temp.check(public.aplicar_toque('cccccccc-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-0000000001ff', null, 'nfc')->>'motivo' = 'mozo_invalido',
  'aplicar_toque rechaza mozo de otro local');
update public.locales set minutos_entre_puntos = 60 where id = '00000000-0000-4000-8000-000000000001';
select pg_temp.check(public.aplicar_toque('cccccccc-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000101', null, 'nfc')->>'tipo' = 'limite',
  'aplicar_toque respeta el límite de tiempo');

-- ---------------------------------------------------------------- interesados (landing)
insert into public.interesados (nombre, local, rubro, whatsapp) values ('Juan', 'Bar Juan', 'Bar', '+5493410000099');
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000002"}', false), set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
select pg_temp.check((select count(*) from public.interesados) = 0, 'un dueño no ve los interesados');
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001"}', false), set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', false);
select pg_temp.check((select count(*) from public.interesados) = 1, 'el superadmin ve los interesados');
update public.interesados set estado = 'contactado';
select pg_temp.check((select estado from public.interesados) = 'contactado', 'el superadmin cambia el estado');
reset role;

-- ---------------------------------------------------------------- apple wallet
insert into public.apple_passes (serial, tarjeta_id, cliente_id, local_id, auth_token)
  select serial, id, cliente_id, local_id, repeat('a', 40) from public.tarjetas where id = 'dddddddd-0000-4000-8000-000000000006';
insert into public.apple_devices (device_library_id, push_token) values ('dev-1', 'tok-1');
insert into public.apple_registrations (device_library_id, serial)
  select 'dev-1', serial from public.tarjetas where id = 'dddddddd-0000-4000-8000-000000000006';
select pg_temp.check((select count(*) from public.apple_registrations) = 1, 'apple: el backend registra un dispositivo');
do $$ begin
  insert into public.apple_passes (serial, tarjeta_id, cliente_id, local_id, auth_token)
    select serial, id, cliente_id, local_id, 'corto' from public.tarjetas where id = 'dddddddd-0000-4000-8000-000000000006';
  raise exception 'debía fallar';
exception when check_violation or unique_violation then null; end $$;
select pg_temp.check(true, 'apple: rechaza tokens cortos o pases duplicados');
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001"}', false), set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', false);
do $$ begin
  perform 1 from public.apple_passes;
  raise exception 'debía fallar';
exception when insufficient_privilege then null; end $$;
select pg_temp.check(true, 'apple: ni el superadmin lee apple_passes (sólo service_role)');
reset role;
set role anon;
do $$ begin
  perform 1 from public.apple_devices;
  raise exception 'debía fallar';
exception when insufficient_privilege then null; end $$;
select pg_temp.check(true, 'apple: anon no lee apple_devices');
reset role;
do $$ begin
  update public.locales set latitud = -32.9 where id = '00000000-0000-4000-8000-000000000001';
  raise exception 'debía fallar';
exception when check_violation then null; end $$;
select pg_temp.check(true, 'locales: latitud y longitud van juntas');
update public.locales set latitud = -32.9, longitud = -60.6 where id = '00000000-0000-4000-8000-000000000001';
delete from public.tarjetas where id = 'dddddddd-0000-4000-8000-000000000006';
select pg_temp.check((select count(*) from public.apple_registrations) = 0 and (select count(*) from public.apple_passes) = 0,
  'apple: borrar la tarjeta borra su pase y sus registros');

-- ---------------------------------------------------------------- mensajes del local
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000002"}', false), set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
select pg_temp.check((public.registrar_mensaje_local('00000000-0000-4000-8000-000000000001', '2x1 hoy', 'Medialunas 2x1 hasta las 12'))->>'ok' = 'true',
  'mensajes: el dueño manda un mensaje');
select pg_temp.check((public.registrar_mensaje_local('00000000-0000-4000-8000-000000000001', 'Otro', 'Otro mensaje'))->>'motivo' = 'limite',
  'mensajes: 1 por día por local');
select pg_temp.check(public.proximo_mensaje_local('00000000-0000-4000-8000-000000000001') > now() + interval '23 hours',
  'mensajes: informa cuándo se puede mandar el próximo');
select pg_temp.check((select count(*) from public.mensajes_local) = 1, 'mensajes: el dueño ve su historial');
do $$ begin
  perform public.registrar_mensaje_local('00000000-0000-4000-8000-00000000000f', 'Hola', 'No es mi local');
  raise exception 'debía fallar';
exception when insufficient_privilege then null; end $$;
select pg_temp.check(true, 'mensajes: no se puede mandar por un local ajeno');
do $$ begin
  update public.mensajes_local set estado = 'error';
  raise exception 'debía fallar';
exception when insufficient_privilege then null; end $$;
select pg_temp.check(true, 'mensajes: el dueño no edita el historial');
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000003"}', false), set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000003', false);
select pg_temp.check((select count(*) from public.mensajes_local) = 0, 'mensajes: otro dueño no ve el historial ajeno');
reset role;
update public.mensajes_local set estado = 'error';
select pg_temp.check(public.proximo_mensaje_local('00000000-0000-4000-8000-000000000001') is null,
  'mensajes: un envío fallido no cuenta para el límite');
do $$ begin
  insert into public.mensajes_local (local_id, titulo, texto) values ('00000000-0000-4000-8000-000000000001', 'Largo', repeat('x', 151));
  raise exception 'debía fallar';
exception when check_violation then null; end $$;
select pg_temp.check(true, 'mensajes: texto de hasta 150 caracteres');

-- ---------------------------------------------------------------- ícono del local
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000002"}', false), set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
do $$ begin
  update public.locales set icono_url = 'https://x.supabase.co/icon.png' where id = '00000000-0000-4000-8000-000000000001';
  raise exception 'debía fallar';
exception when insufficient_privilege then null; end $$;
select pg_temp.check(true, 'ícono: el dueño no escribe icono_url directo (lo hace el servidor)');
reset role;
do $$ begin
  update public.locales set icono_url = 'http://inseguro/icon.png' where id = '00000000-0000-4000-8000-000000000001';
  raise exception 'debía fallar';
exception when check_violation then null; end $$;
select pg_temp.check(true, 'ícono: sólo URLs https');

-- ---------------------------------------------------------------- diseño de la tarjeta
update public.locales set color_texto = '#FFFFFF', color_etiqueta = '#c8f031', nombre_programa = 'Club FairPlay', texto_dorso = 'Sumá en cada compra.'
  where id = '00000000-0000-4000-8000-000000000001';
do $$ begin
  update public.locales set color_texto = 'blanco' where id = '00000000-0000-4000-8000-000000000001';
  raise exception 'debía fallar';
exception when check_violation then null; end $$;
do $$ begin
  update public.locales set nombre_programa = repeat('x', 41) where id = '00000000-0000-4000-8000-000000000001';
  raise exception 'debía fallar';
exception when check_violation then null; end $$;
select pg_temp.check(true, 'diseño: colores hex y nombre del programa de hasta 40');
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000002"}', false), set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
do $$ begin
  update public.locales set franja_url = 'https://x.supabase.co/f.png' where id = '00000000-0000-4000-8000-000000000001';
  raise exception 'debía fallar';
exception when insufficient_privilege then null; end $$;
select pg_temp.check(true, 'diseño: el dueño no escribe el diseño directo (lo hace el servidor)');
reset role;

-- ---------------------------------------------------------------- app móvil
insert into public.intentos_app (ip_hash, exitoso) values (repeat('a', 64), false);
do $$ begin
  insert into public.intentos_app (ip_hash, exitoso) values ('corto', true);
  raise exception 'debía fallar';
exception when check_violation then null; end $$;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001"}', false), set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', false);
do $$ begin
  perform 1 from public.intentos_app;
  raise exception 'debía fallar';
exception when insufficient_privilege then null; end $$;
select pg_temp.check(true, 'app: intentos_app sólo para el servidor (ni el superadmin)');
reset role;
-- Eliminar cuenta: borrar el cliente se lleva tarjetas, celulares y todo lo demás.
insert into public.clientes (id, nombre, whatsapp, consentimiento) values ('cccccccc-0000-4000-8000-0000000000ee', 'Borrar', '+5493410000077', true);
insert into public.tarjetas (id, cliente_id, local_id) values ('dddddddd-0000-4000-8000-0000000000ee', 'cccccccc-0000-4000-8000-0000000000ee', '00000000-0000-4000-8000-000000000001');
insert into public.dispositivos (cliente_id, token_hash) values ('cccccccc-0000-4000-8000-0000000000ee', encode(sha256('app-eliminar-cuenta'::bytea), 'hex'));
delete from public.clientes where id = 'cccccccc-0000-4000-8000-0000000000ee';
select pg_temp.check(
  (select count(*) from public.tarjetas where id = 'dddddddd-0000-4000-8000-0000000000ee') = 0
  and (select count(*) from public.dispositivos where token_hash = encode(sha256('app-eliminar-cuenta'::bytea), 'hex')) = 0,
  'app: eliminar la cuenta borra tarjetas y celulares');

-- ---------------------------------------------------------------- facturación
select pg_temp.check((select count(*) from public.planes where activo) = 2
  and (select precio_centavos from public.planes where codigo = 'basico') = 1500000
  and (select (limites->>'clientes')::int from public.planes where codigo = 'basico') = 300
  and (select limites->'clientes' from public.planes where codigo = 'pro') = 'null'::jsonb,
  'facturación: planes Básico ($15.000, 300 clientes) y Pro (ilimitados) cargados en centavos');
select pg_temp.check((select stock from public.productos where codigo = 'kit_inicial') = 5
  and (select chips_por_unidad from public.productos where codigo = 'kit_inicial') = 10
  and (select costo_envio_centavos from public.config_facturacion) = 500000,
  'facturación: kit (10 chips, 5 en stock), chip suelto y envío fijo cargados');
select pg_temp.check((select s.estado from public.suscripciones s where s.comercio_id = '00000000-0000-4000-8000-0000000000c1') = 'cortesia',
  'facturación: el comercio demo arranca en cortesía');

do $$ begin
  insert into public.locales (slug, nombre) values ('sin-comercio', 'Sin comercio');
  raise exception 'debía fallar';
exception when not_null_violation then null; end $$;
select pg_temp.check(true, 'facturación: todo local pertenece a un comercio');

do $$ begin
  insert into public.suscripciones (comercio_id, plan_id, estado)
  values ('00000000-0000-4000-8000-0000000000c1', (select id from public.planes where codigo = 'basico'), 'cortesia');
  raise exception 'debía fallar';
exception when unique_violation then null; end $$;
select pg_temp.check(true, 'facturación: una sola suscripción vigente por comercio');

do $$ begin
  insert into public.suscripciones (comercio_id, plan_id, estado)
  values ('00000000-0000-4000-8000-0000000000cf', (select id from public.planes where codigo = 'basico'), 'authorized');
  raise exception 'debía fallar';
exception when check_violation then null; end $$;
do $$ begin
  insert into public.suscripciones (comercio_id, plan_id, estado, mp_preapproval_id)
  values ('00000000-0000-4000-8000-0000000000cf', (select id from public.planes where codigo = 'basico'), 'cortesia', 'mp-x');
  raise exception 'debía fallar';
exception when check_violation then null; end $$;
select pg_temp.check(true, 'facturación: una suscripción paga exige id de MP y la cortesía no tiene');

insert into public.suscripciones (id, comercio_id, plan_id, estado, mp_preapproval_id, precio_centavos)
values ('eeeeeeee-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000cf',
        (select id from public.planes where codigo = 'basico'), 'authorized', 'mp-pre-1', 1500000);
insert into public.pagos_suscripcion (suscripcion_id, mp_authorized_payment_id, mp_payment_id, monto_centavos, estado)
values ('eeeeeeee-0000-4000-8000-000000000001', 'ap-1', 'pay-1', 1500000, 'processed');
do $$ begin
  insert into public.pagos_suscripcion (suscripcion_id, mp_authorized_payment_id, monto_centavos, estado)
  values ('eeeeeeee-0000-4000-8000-000000000001', 'ap-1', 1500000, 'processed');
  raise exception 'debía fallar';
exception when unique_violation then null; end $$;
select pg_temp.check(true, 'facturación: la misma cuota de MP no se registra dos veces (webhook duplicado)');

do $$ begin
  insert into public.pedidos (comercio_id, entrega, subtotal_centavos, costo_envio_centavos, total_centavos)
  values ('00000000-0000-4000-8000-0000000000cf', 'retiro', 2500000, 0, 100);
  raise exception 'debía fallar';
exception when check_violation then null; end $$;
do $$ begin
  insert into public.pedidos (comercio_id, entrega, subtotal_centavos, costo_envio_centavos, total_centavos)
  values ('00000000-0000-4000-8000-0000000000cf', 'envio', 2500000, 500000, 3000000);
  raise exception 'debía fallar';
exception when check_violation then null; end $$;
do $$ begin
  update public.productos set stock = -1 where codigo = 'kit_inicial';
  raise exception 'debía fallar';
exception when check_violation then null; end $$;
select pg_temp.check(true, 'facturación: total = subtotal + envío, envío con dirección y stock nunca negativo');

insert into public.eventos_pago (topic, data_id, firma_valida, raw) values ('payment', '1', false, '{}');
insert into public.avisos_comercio (comercio_id, tipo, titulo, texto)
values ('00000000-0000-4000-8000-0000000000cf', 'prueba', 'Aviso', 'Sólo para Otro Bar');

-- Anónimo: no ve precios (sólo se muestran dentro del panel, con sesión).
set role anon;
do $$ begin
  perform 1 from public.planes;
  raise exception 'debía fallar';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform 1 from public.productos;
  raise exception 'debía fallar';
exception when insufficient_privilege then null; end $$;
select pg_temp.check(true, 'facturación: sin sesión no se ven planes ni productos');
select pg_temp.check((select count(*) from public.comercios) = 0 and (select count(*) from public.suscripciones) = 0,
  'facturación: sin sesión no se ven comercios ni suscripciones');
do $$ begin
  perform 1 from public.eventos_pago;
  raise exception 'debía fallar';
exception when insufficient_privilege then null; end $$;
select pg_temp.check(true, 'facturación: el log de webhooks no es accesible sin sesión');
reset role;

-- Dueño de Café Aurora: ve lo suyo, no lo de Otro Bar, y no escribe nada.
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000002"}', false), set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
select pg_temp.check((select count(*) from public.comercios) = 1
  and (select id from public.comercios) = '00000000-0000-4000-8000-0000000000c1'
  and (select count(*) from public.suscripciones) = 1
  and (select count(*) from public.pagos_suscripcion) = 0
  and (select count(*) from public.avisos_comercio) = 0,
  'facturación: el dueño ve sólo su comercio, su suscripción y sus avisos');
select pg_temp.check((select count(*) from public.planes) = 2 and (select count(*) from public.productos) = 2,
  'facturación: el dueño logueado ve los planes y productos');
do $$ begin
  update public.suscripciones set estado = 'authorized';
  raise exception 'debía fallar';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.planes set precio_centavos = 1;
  raise exception 'debía fallar';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform 1 from public.eventos_pago;
  raise exception 'debía fallar';
exception when insufficient_privilege then null; end $$;
select pg_temp.check(true, 'facturación: el dueño no cambia su suscripción ni los precios, ni lee el log de webhooks');
reset role;

-- Dueño de Otro Bar: ve su suscripción paga y su cobro.
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000003"}', false), set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000003', false);
select pg_temp.check((select count(*) from public.pagos_suscripcion) = 1 and (select count(*) from public.avisos_comercio) = 1,
  'facturación: el otro dueño ve su cobro y su aviso');
reset role;

-- Alta de comercio: atómica, con cortesía opcional, sólo desde el servidor.
do $$
declare v_con uuid; v_sin uuid;
begin
  v_con := public.crear_comercio('Nuevo Bar', null, null, 'admin', 'pro');
  v_sin := public.crear_comercio('Bar Registrado', 'Bar', null, 'registro');
  perform pg_temp.check((
    select s.estado = 'cortesia' and s.cortesia_hasta is null and p.codigo = 'pro'
    from public.suscripciones s join public.planes p on p.id = s.plan_id where s.comercio_id = v_con
  ) and (select count(*) from public.historial_suscripcion h join public.suscripciones s on s.id = h.suscripcion_id where s.comercio_id = v_con) = 1,
  'facturación: crear_comercio deja el comercio en cortesía Pro sin fin (con historial)');
  perform pg_temp.check((select count(*) from public.suscripciones where comercio_id = v_sin) = 0,
    'facturación: sin cortesía, el comercio registrado arranca sin suscripción');
end $$;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000002"}', false), set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
do $$ begin
  perform public.crear_comercio('Trucho', null, null, 'admin', 'pro');
  raise exception 'debía fallar';
exception when insufficient_privilege then null; end $$;
select pg_temp.check(true, 'facturación: un dueño no puede darse una cortesía a sí mismo');
reset role;

-- ---------------------------------------------------------------- fase 2: alta
insert into auth.users (id, email) values ('aaaaaaaa-0000-4000-8000-0000000000a1', 'nuevo@bar.test');
do $$
declare v_c uuid; v_c2 uuid; v_s uuid; v_s2 uuid;
begin
  -- Registro propio: comercio + local + dueño, idempotente.
  v_c := public.completar_registro('aaaaaaaa-0000-4000-8000-0000000000a1', 'Bar Nuevo', 'Bar', 'bar-nuevo', '', '20123456786', 'monotributo', 'nuevo@bar.test');
  v_c2 := public.completar_registro('aaaaaaaa-0000-4000-8000-0000000000a1', 'Otro nombre', 'Bar', 'otro-slug', '', '', '', 'nuevo@bar.test');
  perform pg_temp.check(v_c = v_c2
    and (select count(*) from public.locales where comercio_id = v_c) = 1
    and (select slug from public.locales where comercio_id = v_c) = 'bar-nuevo'
    and exists (select 1 from public.miembros_local m join public.locales l on l.id = m.local_id where l.comercio_id = v_c and m.user_id = 'aaaaaaaa-0000-4000-8000-0000000000a1')
    and (select cuit from public.comercios where id = v_c) = '20123456786'
    and (select count(*) from public.suscripciones where comercio_id = v_c) = 0,
    'alta: el registro crea comercio, local y dueño una sola vez (sin suscripción todavía)');

  -- Doble clic: la segunda reserva pierde.
  perform pg_temp.check(public.reservar_alta_suscripcion(v_c) and not public.reservar_alta_suscripcion(v_c),
    'alta: dos altas simultáneas → sólo una puede llamar a Mercado Pago');
  perform public.liberar_alta_suscripcion(v_c);
  perform pg_temp.check(public.reservar_alta_suscripcion(v_c), 'alta: liberada la reserva, se puede reintentar');

  v_s := public.registrar_alta_suscripcion(v_c, (select id from public.planes where codigo = 'pro'), 'mp-alta-1', 'pagador@test', 3000000,
    'trialing', now() + interval '14 days', now() + interval '14 days', 'aaaaaaaa-0000-4000-8000-0000000000a1');
  v_s2 := public.registrar_alta_suscripcion(v_c, (select id from public.planes where codigo = 'pro'), 'mp-alta-1', 'pagador@test', 3000000,
    'trialing', now() + interval '14 days', now() + interval '14 days', 'aaaaaaaa-0000-4000-8000-0000000000a1');
  perform pg_temp.check(v_s = v_s2
    and (select count(*) from public.suscripciones where comercio_id = v_c) = 1
    and (select estado from public.suscripciones where id = v_s) = 'trialing'
    and (select alta_en_curso_hasta from public.comercios where id = v_c) is null
    and (select count(*) from public.avisos_comercio where comercio_id = v_c and tipo = 'suscripcion_alta') = 1
    and (select count(*) from public.historial_suscripcion where suscripcion_id = v_s) = 1,
    'alta: registrar la misma suscripción de MP dos veces no duplica nada (webhook + panel)');
  perform pg_temp.check(not public.reservar_alta_suscripcion(v_c), 'alta: con una suscripción paga vigente no se puede dar otra de alta');

  -- Pasar de cortesía a pago: la cortesía se cierra en la misma transacción.
  v_s := public.registrar_alta_suscripcion('00000000-0000-4000-8000-0000000000c1', (select id from public.planes where codigo = 'basico'),
    'mp-alta-2', 'aurora@test', 1500000, 'authorized', null, now() + interval '1 month', null);
  perform pg_temp.check(
    (select count(*) from public.suscripciones where comercio_id = '00000000-0000-4000-8000-0000000000c1' and estado <> 'cancelled') = 1
    and (select estado from public.suscripciones where comercio_id = '00000000-0000-4000-8000-0000000000c1' and mp_preapproval_id is null) = 'cancelled',
    'alta: pasar de cortesía a pago cierra la cortesía (nunca dos vigentes)');
end $$;

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-0000000000a1"}', false), set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-0000000000a1', false);
select pg_temp.check((select count(*) from public.comercios) = 1 and (select count(*) from public.suscripciones) = 1,
  'alta: el dueño registrado ve su comercio y su suscripción');
do $$ begin
  perform public.reservar_alta_suscripcion((select id from public.comercios limit 1));
  raise exception 'debía fallar';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.completar_registro('aaaaaaaa-0000-4000-8000-0000000000a1', 'X', 'Bar', 'x', '', '', '', 'x@x');
  raise exception 'debía fallar';
exception when insufficient_privilege then null; end $$;
select pg_temp.check(true, 'alta: las funciones de alta sólo las usa el servidor');
reset role;

-- ---------------------------------------------------------------- límite de mensajes por local
insert into public.mensajes_local (local_id, titulo, texto, estado)
values ('00000000-0000-4000-8000-00000000000f', 'Hola', 'Primer mensaje', 'enviado');
select pg_temp.check(public.proximo_mensaje_local('00000000-0000-4000-8000-00000000000f') is not null,
  'mensajes: por defecto, 1 cada 24 horas');
update public.locales set horas_entre_mensajes = 0 where id = '00000000-0000-4000-8000-00000000000f';
select pg_temp.check(public.proximo_mensaje_local('00000000-0000-4000-8000-00000000000f') is null,
  'mensajes: con 0 horas, sin límite');
update public.locales set horas_entre_mensajes = 2 where id = '00000000-0000-4000-8000-00000000000f';
select pg_temp.check(public.proximo_mensaje_local('00000000-0000-4000-8000-00000000000f') between now() + interval '1 hour 59 minutes' and now() + interval '2 hours',
  'mensajes: con 2 horas, el próximo es 2 horas después del último');
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000003"}', false), set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000003', false);
do $$ begin
  update public.locales set horas_entre_mensajes = 0 where id = '00000000-0000-4000-8000-00000000000f';
  raise exception 'debía fallar';
exception when insufficient_privilege then null; end $$;
select pg_temp.check(true, 'mensajes: el dueño no puede sacarse el límite');
reset role;

\echo 'TODOS LOS TESTS DE BASE PASARON'
