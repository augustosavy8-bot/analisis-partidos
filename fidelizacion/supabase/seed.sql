-- =============================================================================
-- Seed de desarrollo: un local demo, 2 mozos, 2 chips en MODO PRUEBA y premios.
-- Los tokens de prueba son públicos (están en el repo): NO usar en producción.
--
-- URLs para grabar en tags NTAG213 (reemplazá el dominio):
--   Chip de Lucía:  http://localhost:3000/n?t=V3T9H9CbnTQPmJVstgnPn1SV
--   Chip de Martín: http://localhost:3000/n?t=j7BouD2PYHicm51uzVMZO8tH
-- PIN de los mozos (QR de respaldo): Lucía 1234, Martín 5678.
-- =============================================================================

insert into public.locales (id, slug, nombre, rubro, color_primario, color_secundario, minutos_entre_puntos)
values (
  '00000000-0000-4000-8000-000000000001',
  'cafe-aurora',
  'Café Aurora',
  'Cafetería de especialidad',
  '#3b2a20',
  '#e0a458',
  2  -- 2 minutos para poder probar seguido; en un local real, p. ej. 240 (4 h).
);

insert into public.mozos (id, local_id, nombre, pin_hash) values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'Lucía',
   'scrypt$16384$8$1$_5AUqJaO1pqsAoJwMs-FXg$pmPTpaHpZ70huoEbh-_MJE5efFt-9z8QcFaR1KDCcUY'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', 'Martín',
   'scrypt$16384$8$1$-NXb9bInMaQycXmb3eSuxg$W-4otBydQ2wgbVCcRb6uR5CK6nF1tj4f93GHrynFlCg');

insert into public.chips (id, uid, local_id, mozo_id, etiqueta, modo, token_prueba_hash) values
  ('00000000-0000-4000-8000-000000000201', '04DE000000A001', '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000101', 'Llavero Lucía (prueba)', 'prueba',
   encode(sha256(convert_to('V3T9H9CbnTQPmJVstgnPn1SV', 'UTF8')), 'hex')),
  ('00000000-0000-4000-8000-000000000202', '04DE000000A002', '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000102', 'Llavero Martín (prueba)', 'prueba',
   encode(sha256(convert_to('j7BouD2PYHicm51uzVMZO8tH', 'UTF8')), 'hex'));

insert into public.premios (local_id, nombre, descripcion, puntos_necesarios, orden) values
  ('00000000-0000-4000-8000-000000000001', 'Café gratis', 'Un café de la carta, el que quieras', 8, 1),
  ('00000000-0000-4000-8000-000000000001', 'Café + medialuna', 'Desayuno clásico de regalo', 12, 2);
