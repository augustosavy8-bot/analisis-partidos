-- =============================================================================
-- Planes definitivos (2/10/2026):
--   Básico $25.000 — austero a propósito (ancla de precio: nadie debería elegirlo).
--   Pro    $40.000 — el recomendado (destacado), con todo lo que usa un local.
--   Max    $80.000 — todo, sin límites, para cadenas.
-- Se descartan los planes de MP guardados: la próxima alta crea uno con el precio
-- nuevo. Nuevo límite "diseno": logo e imágenes propias en la tarjeta.
-- =============================================================================
alter table public.planes add column destacado boolean not null default false;

update public.planes set
  nombre = 'Básico',
  descripcion = 'Lo mínimo para probar el sistema en un local.',
  precio_centavos = 2500000,
  limites = '{"locales": 1, "clientes": 100, "premios": 2, "promos": false, "mensajes": false, "estadisticas": "basicas", "diseno": false}',
  destacado = false,
  orden = 1,
  mp_preapproval_plan_id = null
where codigo = 'basico';

update public.planes set
  nombre = 'Pro',
  descripcion = 'Todo lo que necesita tu local para que los clientes vuelvan.',
  precio_centavos = 4000000,
  limites = '{"locales": 1, "clientes": null, "premios": null, "promos": true, "mensajes": true, "estadisticas": "avanzadas", "diseno": true}',
  destacado = true,
  orden = 2,
  mp_preapproval_plan_id = null
where codigo = 'pro';

insert into public.planes (codigo, nombre, descripcion, precio_centavos, limites, dias_prueba, orden, destacado)
values ('max', 'Max', 'Todo Point, sin límites, para cadenas y varios locales.', 8000000,
        '{"locales": null, "clientes": null, "premios": null, "promos": true, "mensajes": true, "estadisticas": "avanzadas", "diseno": true}',
        14, 3, false)
on conflict (codigo) do update set
  nombre = excluded.nombre, descripcion = excluded.descripcion, precio_centavos = excluded.precio_centavos,
  limites = excluded.limites, orden = excluded.orden, mp_preapproval_plan_id = null;
