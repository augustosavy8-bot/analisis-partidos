-- =============================================================================
-- Cómo llama cada local a su personal (mozo, vendedor, barbero…).
-- Los textos de la tarjeta, el QR y el panel se adaptan a este término.
-- =============================================================================

alter table public.locales
  add column termino_personal text not null default 'mozo'
  check (termino_personal in ('mozo', 'vendedor', 'barbero', 'cajero', 'empleado', 'profesor', 'estilista'));

grant update (termino_personal) on public.locales to authenticated;
