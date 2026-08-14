-- Nuevo flujo de registro: el usuario establece su contraseña al solicitar
-- acceso (se crea ya en auth.users, sin email de verificación); no tiene
-- acceso real hasta que un admin lo aprueba desde Ajustes (se crea entonces
-- su fila en public.usuarios). solicitudes_acceso.user_id enlaza la
-- solicitud con la cuenta ya creada en auth.users.
alter table public.solicitudes_acceso
  add column user_id uuid references auth.users (id) on delete cascade;

-- La creación de la solicitud pasa a hacerse siempre desde un Route Handler
-- con la service role key (que necesita para crear el usuario en Auth), así
-- que ya no hace falta permitir el insert público directo.
drop policy "solicitudes_acceso_insert_public" on public.solicitudes_acceso;
