-- =============================================================================
-- Precios nuevos (2/10/2026) con cartel de promo: el precio "de lista" (+15%)
-- se muestra tachado al lado del precio real. Se saca el plan de prueba de $15.
-- (Las suscripciones ya hechas mantienen su precio: MP cobra lo pactado.)
-- =============================================================================
alter table public.planes add column if not exists precio_lista_centavos integer
  check (precio_lista_centavos is null or precio_lista_centavos > 0);
alter table public.planes add column if not exists promo_texto text
  check (promo_texto is null or length(promo_texto) between 2 and 40);

update public.planes set activo = false where codigo = 'prueba';

-- Básico $50.000 (lista $57.500) · Pro $80.000 (lista $92.000) · Max $160.000 (lista $184.000).
-- Misma proporción que antes (1 : 1,6 : 3,2). El plan de MP se recrea solo con el precio nuevo.
update public.planes set precio_centavos = 5000000,  precio_lista_centavos = 5750000,  promo_texto = 'Precio de lanzamiento', mp_preapproval_plan_id = null where codigo = 'basico';
update public.planes set precio_centavos = 8000000,  precio_lista_centavos = 9200000,  promo_texto = 'Precio de lanzamiento', mp_preapproval_plan_id = null where codigo = 'pro';
update public.planes set precio_centavos = 16000000, precio_lista_centavos = 18400000, promo_texto = 'Precio de lanzamiento', mp_preapproval_plan_id = null where codigo = 'max';
