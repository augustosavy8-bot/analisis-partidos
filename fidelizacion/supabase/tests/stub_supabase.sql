-- Emula lo mínimo de Supabase (roles, schema auth, auth.uid()) para correr las
-- migraciones en un Postgres pelado. NO se aplica en Supabase.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid
$$;
grant usage on schema public to anon, authenticated, service_role;
-- Supabase otorga ALL por defecto; lo replicamos para verificar que las migraciones lo revocan.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
