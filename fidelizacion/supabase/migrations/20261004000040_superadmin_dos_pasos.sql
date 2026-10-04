-- =============================================================================
-- Superadmin con verificación en dos pasos (Supabase Auth MFA, TOTP).
--
-- Con sólo la contraseña del superadmin se podía ver y tocar todos los locales y
-- pedir las claves de los chips. Ahora los permisos de superadmin en la base
-- exigen una sesión verificada con el código de la app autenticadora (aal2).
-- =============================================================================

create or replace function public.es_superadmin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.superadmins where user_id = (select auth.uid()))
     and coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'aal', '') = 'aal2';
$$;

-- Los wrappers del servidor (que ya validó la sesión real) conservan el nivel.
create or replace function public.registrar_mensaje_local_de(p_user_id uuid, p_local_id uuid, p_titulo text, p_texto text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'aal', 'aal2')::text, true);
  return public.registrar_mensaje_local(p_local_id, p_titulo, p_texto);
end;
$$;

create or replace function public.panel_metricas_de(p_user_id uuid, p_local_id uuid, p_dias integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'aal', 'aal2')::text, true);
  return public.panel_metricas(p_local_id, least(greatest(p_dias, 1), 365));
end;
$$;
