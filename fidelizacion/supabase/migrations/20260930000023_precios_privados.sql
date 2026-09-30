-- Los precios ya no son públicos: sólo los ve el dueño registrado, dentro del panel
-- (/panel/facturacion). El servidor los lee con service_role; sin sesión, nada.
drop policy if exists planes_publicos on public.planes;
drop policy if exists productos_publicos on public.productos;
drop policy if exists config_facturacion_lectura on public.config_facturacion;
create policy config_facturacion_lectura on public.config_facturacion for select to authenticated using (true);
revoke select on public.planes, public.productos, public.config_facturacion from anon;
