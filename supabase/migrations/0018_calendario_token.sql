-- Token secreto por usuario para el feed de calendario suscribible (.ics).
-- No lleva RLS de lectura para el cliente: el endpoint que lo consulta usa
-- la service_role key y valida el token él mismo, ya que Apple Calendar no
-- puede mandar la sesión de Supabase Auth al pedir el feed.
alter table public.usuarios
  add column calendario_token uuid not null default gen_random_uuid();

create unique index usuarios_calendario_token_idx
  on public.usuarios (calendario_token);
