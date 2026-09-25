-- =============================================================================
-- Animación que ve el cliente al canjear: check (genérica) o café (bares y cafeterías).
-- =============================================================================

alter table public.locales
  add column animacion_canje text not null default 'check'
  check (animacion_canje in ('check', 'cafe'));

grant update (animacion_canje) on public.locales to authenticated;
