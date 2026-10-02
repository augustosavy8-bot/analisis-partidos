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

-- Pro $50.000 (lista $57.500) · Básico $30.000 (lista $34.500) · Max $100.000 (lista $115.000).
-- El plan de MP se recrea solo con el precio nuevo.
update public.planes set precio_centavos = 3000000,  precio_lista_centavos = 3450000,  promo_texto = 'Precio de lanzamiento', mp_preapproval_plan_id = null where codigo = 'basico';
update public.planes set precio_centavos = 5000000,  precio_lista_centavos = 5750000,  promo_texto = 'Precio de lanzamiento', mp_preapproval_plan_id = null where codigo = 'pro';
update public.planes set precio_centavos = 10000000, precio_lista_centavos = 11500000, promo_texto = 'Precio de lanzamiento', mp_preapproval_plan_id = null where codigo = 'max';
