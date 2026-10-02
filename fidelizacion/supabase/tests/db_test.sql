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
select pg_temp.check((select count(*) from public.planes where activo) = 3
  and (select precio_centavos from public.planes where codigo = 'basico') = 2500000
  and (select precio_centavos from public.planes where codigo = 'pro') = 4000000
  and (select precio_centavos from public.planes where codigo = 'max') = 8000000
  and (select (limites->>'clientes')::int from public.planes where codigo = 'basico') = 50
  and (select (limites->>'clientes')::int from public.planes where codigo = 'pro') = 200
  and (select limites->'clientes' from public.planes where codigo = 'max') = 'null'::jsonb
  and (select destacado from public.planes where codigo = 'pro'),
  'facturación: Básico $25.000 (austero), Pro $40.000 (recomendado) y Max $80.000, en centavos');
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
select pg_temp.check((select count(*) from public.planes) = 3 and (select count(*) from public.productos) = 1,
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
  perform pg_temp.check((select count(*) from public.pedidos p join public.pedido_items i on i.pedido_id = p.id
                          where p.comercio_id = v_c and p.regalo and p.estado = 'pagado' and p.total_centavos = 0 and i.cantidad = 1) = 1,
    'alta: el plan incluye 1 llavero (pedido sin cargo, una sola vez)');
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

-- ---------------------------------------------------------------- fase 3: webhooks
do $$
declare v_s uuid := 'eeeeeeee-0000-4000-8000-000000000001'; v_q1 uuid; v_q2 uuid;
begin
  -- Cobro fallido → past_due con fecha, historial y aviso.
  perform public.aplicar_cambio_suscripcion(v_s, 'past_due', '{}', 'Cuota rechazada', 'webhook');
  perform pg_temp.check((select estado = 'past_due' and past_due_desde is not null from public.suscripciones where id = v_s)
    and (select count(*) from public.avisos_comercio a join public.suscripciones s on s.comercio_id = a.comercio_id where s.id = v_s and a.tipo = 'cobro_fallido') = 1,
    'webhooks: cobro fallido pasa a past_due y avisa al comercio');
  -- El mismo evento otra vez no duplica historial ni aviso.
  perform public.aplicar_cambio_suscripcion(v_s, 'past_due', '{}', 'Cuota rechazada', 'webhook');
  perform pg_temp.check((select count(*) from public.historial_suscripcion where suscripcion_id = v_s and a_estado = 'past_due') = 1,
    'webhooks: el mismo evento dos veces no duplica el historial');
  -- Cobro recuperado → authorized, se limpia past_due y se extiende el período.
  perform public.aplicar_cambio_suscripcion(v_s, 'authorized', '{"current_period_end":"2030-01-01T00:00:00Z"}', 'Cuota cobrada', 'webhook');
  perform pg_temp.check((select estado = 'authorized' and past_due_desde is null and current_period_end = '2030-01-01T00:00:00Z' from public.suscripciones where id = v_s),
    'webhooks: el cobro recuperado vuelve a authorized y extiende el período');

  -- Cuotas idempotentes; una versión vieja no pisa la nueva.
  v_q1 := public.registrar_cuota(v_s, 'ap-fase3', 'pay-f3', 1500000, 'recycling', 'rejected', 'cc_rejected_insufficient_amount', 2, now(), null);
  v_q2 := public.registrar_cuota(v_s, 'ap-fase3', 'pay-f3', 1500000, 'scheduled', null, null, 1, now(), null);
  perform pg_temp.check(v_q1 = v_q2 and (select estado from public.pagos_suscripcion where id = v_q1) = 'recycling'
    and (select count(*) from public.pagos_suscripcion where mp_authorized_payment_id = 'ap-fase3') = 1,
    'webhooks: la misma cuota se guarda una vez y un evento viejo no la pisa');

  -- Cancelada es terminal.
  perform public.aplicar_cambio_suscripcion(v_s, 'cancelled', '{}', 'Cancelada en MP', 'webhook');
  perform pg_temp.check(not public.aplicar_cambio_suscripcion(v_s, 'authorized', '{}', 'Webhook tardío', 'webhook')
    and (select estado from public.suscripciones where id = v_s) = 'cancelled',
    'webhooks: un webhook tardío no resucita una suscripción cancelada');
end $$;

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000003"}', false), set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000003', false);
do $$ begin
  perform public.aplicar_cambio_suscripcion('eeeeeeee-0000-4000-8000-000000000001', 'authorized', '{}', 'x', 'panel');
  raise exception 'debía fallar';
exception when insufficient_privilege then null; end $$;
select pg_temp.check(true, 'webhooks: el dueño no puede cambiar el estado de su suscripción');
reset role;

-- ---------------------------------------------------------------- fase 4: morosidad
do $$
declare
  v_aurora uuid := '00000000-0000-4000-8000-000000000001';
  v_otro uuid := '00000000-0000-4000-8000-00000000000f';
  v_cliente uuid := 'cccccccc-0000-4000-8000-0000000000f4';
  v_tarjeta uuid;
  v_puntos int; v_r jsonb; v_s uuid;
begin
  insert into public.clientes (id, nombre, whatsapp, consentimiento) values (v_cliente, 'Fase Cuatro', '+5493410000444', true);
  v_tarjeta := public.asegurar_tarjeta(v_cliente, v_aurora);
  perform pg_temp.check(public.suma_habilitada_local(v_aurora), 'morosidad: cortesía sin fin suma');

  -- Otro Bar canceló estando al día (fase 3): conserva lo pagado hasta 2030.
  perform pg_temp.check(public.suma_habilitada_local(v_otro), 'morosidad: cancelada al día suma hasta el fin del período pago');
  update public.suscripciones set current_period_end = now() - interval '1 day' where comercio_id = '00000000-0000-4000-8000-0000000000cf';
  perform pg_temp.check(not public.suma_habilitada_local(v_otro), 'morosidad: cancelada y sin período pago no suma');

  -- Cortesía vencida: el toque no suma, responde programa_pausado, y deja el toque marcado (canje al toque).
  update public.suscripciones set estado = 'cancelled', cancelada_en = now(), current_period_end = null
   where comercio_id = '00000000-0000-4000-8000-0000000000c1' and estado <> 'cancelled';
  insert into public.suscripciones (comercio_id, plan_id, estado, cortesia_hasta)
  values ('00000000-0000-4000-8000-0000000000c1', (select id from public.planes where codigo = 'pro'), 'cortesia', now() - interval '1 day');
  update public.tarjetas set ultimo_toque_en = null where id = v_tarjeta;
  select puntos into v_puntos from public.tarjetas where id = v_tarjeta;
  v_r := public.aplicar_toque(v_cliente, v_aurora, '00000000-0000-4000-8000-000000000101', null, 'nfc');
  perform pg_temp.check(v_r->>'motivo' = 'programa_pausado'
    and (select puntos from public.tarjetas where id = v_tarjeta) = v_puntos
    and (select ultimo_toque_en is not null from public.tarjetas where id = v_tarjeta),
    'morosidad: programa pausado no suma pero registra el toque (para poder canjear)');

  -- Morosa: gracia (10) + sumar (7) = 17 días sumando desde el primer cobro fallido.
  update public.suscripciones set estado = 'cancelled', cancelada_en = now(), current_period_end = null
   where comercio_id = '00000000-0000-4000-8000-0000000000c1' and estado <> 'cancelled';
  insert into public.suscripciones (comercio_id, plan_id, estado, mp_preapproval_id, precio_centavos, past_due_desde, current_period_end)
  values ('00000000-0000-4000-8000-0000000000c1', (select id from public.planes where codigo = 'pro'), 'past_due', 'mp-moroso', 3000000,
          now() - interval '5 days', now() + interval '20 days')
  returning id into v_s;
  perform pg_temp.check(public.suma_habilitada_local(v_aurora), 'morosidad: en gracia suma');
  update public.suscripciones set past_due_desde = now() - interval '16 days' where id = v_s;
  perform pg_temp.check(public.suma_habilitada_local(v_aurora), 'morosidad: pasada la gracia, sigue sumando unos días');
  update public.suscripciones set past_due_desde = now() - interval '18 days' where id = v_s;
  perform pg_temp.check(not public.suma_habilitada_local(v_aurora), 'morosidad: después de gracia + días de sumar, no suma');

  -- MP la cancela por impaga: no conserva un "período pago" que no pagó.
  perform public.aplicar_cambio_suscripcion(v_s, 'cancelled', '{"current_period_end":"2031-01-01T00:00:00Z"}', 'MP canceló por 3 cuotas impagas', 'webhook');
  perform pg_temp.check((select current_period_end <= now() from public.suscripciones where id = v_s),
    'morosidad: cancelada por falta de pago pierde el acceso en el momento');

  -- Pausada: el panel se restringe pero sumar sigue.
  insert into public.suscripciones (comercio_id, plan_id, estado, mp_preapproval_id, precio_centavos)
  values ('00000000-0000-4000-8000-0000000000c1', (select id from public.planes where codigo = 'pro'), 'paused', 'mp-pausada', 3000000)
  returning id into v_s;
  perform pg_temp.check(public.suma_habilitada_local(v_aurora), 'morosidad: pausada sigue sumando');
  perform public.aplicar_cambio_suscripcion(v_s, 'authorized', '{}', 'Reactivada', 'panel');
  perform pg_temp.check((select count(*) from public.avisos_comercio where comercio_id = '00000000-0000-4000-8000-0000000000c1' and tipo = 'suscripcion_reactivada') = 1,
    'morosidad: reactivar avisa al comercio');
end $$;

-- ---------------------------------------------------------------- fase 5: cambio de plan
do $$
declare
  v_c uuid := '00000000-0000-4000-8000-0000000000cf';
  v_local uuid := '00000000-0000-4000-8000-00000000000f';
  v_pro uuid := (select id from public.planes where codigo = 'pro');
  v_basico uuid := (select id from public.planes where codigo = 'basico');
  v_s uuid;
  v_r text;
  v_ok boolean;
begin
  update public.suscripciones set estado = 'cancelled', cancelada_en = now() where comercio_id = v_c and estado <> 'cancelled';
  insert into public.suscripciones (comercio_id, plan_id, estado, mp_preapproval_id, precio_centavos, current_period_end)
  values (v_c, v_pro, 'authorized', 'mp-cambio-plan', 3000000, now() + interval '10 days') returning id into v_s;
  insert into public.promos (local_id, nombre, dias, desde, hasta, puntos) values (v_local, 'Doble', array[1,2]::smallint[], '10:00', '12:00', 2);
  update public.locales set puntos_bienvenida = 5 where id = v_local;

  -- Bajar a Básico: programado; hasta el fin del período sigue con Pro y sus promos.
  v_r := public.cambiar_plan_suscripcion(v_s, v_basico, false, 1500000, null);
  perform pg_temp.check(v_r = 'programado'
    and (select plan_id = v_pro and plan_programado_id = v_basico and precio_centavos = 1500000 from public.suscripciones where id = v_s)
    and (select bool_and(activa) from public.promos where local_id = v_local),
    'cambio de plan: bajar queda programado y conserva Pro hasta el fin del período');
  perform pg_temp.check(not public.aplicar_plan_programado(v_s), 'cambio de plan: antes del fin del período no se aplica');

  -- Volver a elegir Pro anula el cambio programado.
  v_r := public.cambiar_plan_suscripcion(v_s, v_pro, false, 3000000, null);
  perform pg_temp.check(v_r = 'anulado'
    and (select plan_programado_id is null from public.suscripciones where id = v_s),
    'cambio de plan: elegir el plan actual anula el programado');

  -- Programado + llega el fin del período: pasa a Básico y se apagan promos y regalos.
  perform public.cambiar_plan_suscripcion(v_s, v_basico, false, 1500000, null);
  update public.suscripciones set current_period_end = now() - interval '1 minute' where id = v_s;
  v_ok := public.aplicar_plan_programado(v_s);
  perform pg_temp.check(v_ok
    and (select plan_id = v_basico and plan_programado_id is null from public.suscripciones where id = v_s)
    and not (select bool_or(activa) from public.promos where local_id = v_local)
    and (select puntos_bienvenida = 0 from public.locales where id = v_local),
    'cambio de plan: al fin del período pasa a Básico y apaga promos y regalos');
  perform pg_temp.check(not public.aplicar_plan_programado(v_s), 'cambio de plan: aplicar dos veces no hace nada');

  -- Subir a Pro: inmediato.
  v_r := public.cambiar_plan_suscripcion(v_s, v_pro, true, 3000000, null);
  perform pg_temp.check(v_r = 'inmediato'
    and (select plan_id = v_pro from public.suscripciones where id = v_s),
    'cambio de plan: subir es inmediato');

  -- Impaga: no se puede cambiar de plan.
  update public.suscripciones set estado = 'past_due', past_due_desde = now() where id = v_s;
  begin
    perform public.cambiar_plan_suscripcion(v_s, v_basico, false, 1500000, null);
    raise exception 'debía fallar';
  exception when invalid_parameter_value then null;
  end;
  perform pg_temp.check(true, 'cambio de plan: con pago pendiente no se puede cambiar');
end $$;

-- ---------------------------------------------------------------- fase 6: kit
do $$
declare
  v_c uuid := '00000000-0000-4000-8000-0000000000cf';
  v_r jsonb; v_r2 jsonb; v_p uuid; v_stock_kit int; v_estado text; v_res text;
begin
  -- El kit ya no se vende; se reactiva sólo para probar el mecanismo de pedidos.
  update public.productos set stock = 5, activo = true, precio_centavos = 2500000 where codigo = 'kit_inicial';
  update public.productos set precio_centavos = 300000 where codigo = 'chip';
  update public.productos set stock = 50 where codigo = 'chip';

  -- Pedido: precios y envío desde la base, stock reservado.
  v_r := public.crear_pedido(v_c, '[{"codigo":"kit_inicial","cantidad":1},{"codigo":"chip","cantidad":2}]', 'envio', '{"calle":"San Martín 123"}');
  v_p := (v_r->>'pedido_id')::uuid;
  perform pg_temp.check((v_r->>'ok')::boolean and (v_r->>'total_centavos')::int = 2500000 + 2 * 300000 + 500000
    and (select stock from public.productos where codigo = 'kit_inicial') = 4
    and (select stock from public.productos where codigo = 'chip') = 48,
    'kit: el pedido calcula el total en la base y reserva el stock');

  -- Más de lo que hay: no crea nada.
  v_r2 := public.crear_pedido(v_c, '[{"codigo":"chip","cantidad":31}]', 'retiro', null);
  perform pg_temp.check(not (v_r2->>'ok')::boolean and v_r2->>'motivo' like 'max_por_pedido:%', 'kit: más del máximo por pedido no crea nada');
  update public.productos set stock = 1 where codigo = 'chip';
  v_r2 := public.crear_pedido(v_c, '[{"codigo":"chip","cantidad":4}]', 'retiro', null);  -- 1 + 2 que libera el anterior = 3
  update public.productos set stock = 48 where codigo = 'chip';
  perform pg_temp.check(not (v_r2->>'ok')::boolean and v_r2->>'motivo' like 'sin_stock:%', 'kit: sin stock suficiente no se crea el pedido');

  -- Un nuevo pedido cancela el impago anterior y le devuelve el stock.
  perform pg_temp.check((select estado from public.pedidos where id = v_p) = 'pendiente_pago', 'kit: un pedido fallido no toca el anterior');
  v_r2 := public.crear_pedido(v_c, '[{"codigo":"kit_inicial","cantidad":1}]', 'retiro', null);
  perform pg_temp.check((select estado from public.pedidos where id = v_p) = 'cancelado'
    and (select stock from public.productos where codigo = 'chip') = 50
    and (select stock from public.productos where codigo = 'kit_inicial') = 4
    and (v_r2->>'total_centavos')::int = 2500000,
    'kit: el pedido nuevo cancela el impago anterior (sin acaparar stock); retiro no paga envío');
  v_p := (v_r2->>'pedido_id')::uuid;

  -- Pago rechazado: el pedido sigue esperando. Monto distinto: no se marca.
  v_res := public.registrar_pago_pedido(v_p, 'pay-kit-1', 'rejected', 'cc_rejected_other_reason', 2500000, 'credit_card');
  perform pg_temp.check(v_res = 'registrado' and (select estado from public.pedidos where id = v_p) = 'pendiente_pago', 'kit: pago rechazado no cambia el pedido');
  v_res := public.registrar_pago_pedido(v_p, 'pay-kit-2', 'approved', 'accredited', 100, 'credit_card');
  perform pg_temp.check(v_res = 'monto_distinto' and (select estado from public.pedidos where id = v_p) = 'pendiente_pago', 'kit: un pago por otro monto no marca el pedido');

  -- Aprobado: pagado, idempotente.
  v_res := public.registrar_pago_pedido(v_p, 'pay-kit-3', 'approved', 'accredited', 2500000, 'credit_card');
  perform pg_temp.check(v_res = 'pagado' and (select estado from public.pedidos where id = v_p) = 'pagado', 'kit: pago aprobado marca el pedido');
  v_res := public.registrar_pago_pedido(v_p, 'pay-kit-3', 'approved', 'accredited', 2500000, 'credit_card');
  perform pg_temp.check(v_res = 'ya_pagado' and (select count(*) from public.pagos where mp_payment_id = 'pay-kit-3') = 1, 'kit: el mismo pago dos veces no duplica');

  -- Reserva vencida: el stock vuelve.
  v_r := public.crear_pedido(v_c, '[{"codigo":"kit_inicial","cantidad":2}]', 'retiro', null);
  select stock into v_stock_kit from public.productos where codigo = 'kit_inicial';
  update public.pedidos set reserva_hasta = now() - interval '1 minute' where id = (v_r->>'pedido_id')::uuid;
  perform public.liberar_reservas_vencidas();
  perform pg_temp.check((select estado from public.pedidos where id = (v_r->>'pedido_id')::uuid) = 'expirado'
    and (select stock from public.productos where codigo = 'kit_inicial') = v_stock_kit + 2,
    'kit: la reserva vencida devuelve el stock');
end $$;

-- ---------------------------------------------------------------- fase 7: admin
do $$
declare
  v_c uuid := '00000000-0000-4000-8000-0000000000cf';
  v_pro uuid := (select id from public.planes where codigo = 'pro');
  v_basico uuid := (select id from public.planes where codigo = 'basico');
  v_r text; v_ped jsonb; v_p uuid; v_stock int;
begin
  -- Con suscripción paga vigente no se pisa con cortesía.
  update public.suscripciones set estado = 'authorized', past_due_desde = null where comercio_id = v_c and estado <> 'cancelled';
  v_r := public.admin_set_cortesia(v_c, v_pro, null, null);
  perform pg_temp.check(v_r = 'tiene_suscripcion_paga', 'admin: la cortesía no pisa una suscripción paga');

  -- Sin suscripción: se crea; después se edita (plan y fin).
  update public.suscripciones set estado = 'cancelled', cancelada_en = now(), current_period_end = null where comercio_id = v_c and estado <> 'cancelled';
  v_r := public.admin_set_cortesia(v_c, v_basico, null, null);
  perform pg_temp.check(v_r = 'creada' and (select count(*) from public.suscripciones where comercio_id = v_c and estado = 'cortesia') = 1,
    'admin: da cortesía a un comercio sin suscripción');
  v_r := public.admin_set_cortesia(v_c, v_pro, now() + interval '30 days', null);
  perform pg_temp.check(v_r = 'editada' and (select plan_id = v_pro and cortesia_hasta is not null from public.suscripciones where comercio_id = v_c and estado = 'cortesia'),
    'admin: edita plan y fin de la cortesía');

  -- Pedido: transiciones válidas e inválidas.
  v_ped := public.crear_pedido(v_c, '[{"codigo":"chip","cantidad":3}]', 'retiro', null);
  v_p := (v_ped->>'pedido_id')::uuid;
  perform pg_temp.check(public.admin_estado_pedido(v_p, 'preparando') = 'transicion_invalida', 'admin: un pedido impago no se prepara');
  perform public.registrar_pago_pedido(v_p, 'pay-admin-1', 'approved', 'accredited', 900000, 'account_money');
  perform pg_temp.check(public.admin_estado_pedido(v_p, 'enviado') = 'transicion_invalida', 'admin: un pedido de retiro no se "envía"');
  v_r := public.admin_estado_pedido(v_p, 'listo_retiro');
  perform pg_temp.check(v_r = 'ok' and (select estado from public.pedidos where id = v_p) = 'listo_retiro'
    and exists (select 1 from public.avisos_comercio where comercio_id = v_c and tipo = 'pedido_listo_retiro'),
    'admin: listo para retirar avisa al comercio');

  -- Reembolso con devolución de stock.
  select stock into v_stock from public.productos where codigo = 'chip';
  v_r := public.admin_reembolso_pedido(v_p, 'pay-admin-1', true);
  perform pg_temp.check(v_r = 'ok' and (select estado from public.pedidos where id = v_p) = 'reembolsado'
    and (select stock from public.productos where codigo = 'chip') = v_stock + 3
    and (select reembolsado_centavos from public.pagos where mp_payment_id = 'pay-admin-1') = 900000,
    'admin: el reembolso marca el pedido y devuelve el stock');
end $$;

-- ---------------------------------------------------------------- arrepentimiento
insert into public.solicitudes_arrepentimiento (codigo, nombre, email, tipo) values ('ARR-TEST01', 'Ana', 'ana@test.com', 'pedido');
set role anon;
do $$ begin
  perform 1 from public.solicitudes_arrepentimiento;
  raise exception 'debía fallar';
exception when insufficient_privilege then null; end $$;
reset role;
select pg_temp.check(true, 'arrepentimiento: las solicitudes (con emails) no se leen desde afuera');

\echo 'TODOS LOS TESTS DE BASE PASARON'
