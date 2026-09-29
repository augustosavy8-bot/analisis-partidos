-- =============================================================================
-- Ícono de notificaciones del local (icon.png de Apple Wallet, ícono de la PWA y
-- de Google Wallet). Se sube a Storage (bucket logos, {local_id}/icon.png) desde
-- el panel; el servidor valida la imagen y guarda acá la URL pública.
-- Lo escribe sólo el servidor (service_role): el dueño no tiene grant de update.
-- =============================================================================

alter table public.locales
  add column icono_url text check (icono_url is null or (icono_url ~ '^https://\S+$' and length(icono_url) <= 600));
