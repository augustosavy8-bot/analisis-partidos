-- =============================================================================
-- Diseño de la tarjeta en las billeteras (panel > Diseño de tarjeta).
-- Todo es opcional: en null se usa lo de siempre (texto y etiquetas calculados
-- por contraste con el color principal, franja generada con los sellos, nombre
-- del programa = nombre del local). Así los locales existentes no cambian.
-- Lo escribe sólo el servidor (service_role): el dueño no tiene grant de update.
-- =============================================================================

alter table public.locales
  add column color_texto     text check (color_texto is null or color_texto ~* '^#[0-9a-f]{6}$'),
  add column color_etiqueta  text check (color_etiqueta is null or color_etiqueta ~* '^#[0-9a-f]{6}$'),
  add column franja_url      text check (franja_url is null or (franja_url ~ '^https://\S+$' and length(franja_url) <= 600)),
  add column nombre_programa text check (nombre_programa is null or char_length(nombre_programa) between 2 and 40),
  add column texto_dorso     text check (texto_dorso is null or char_length(texto_dorso) between 1 and 500);
