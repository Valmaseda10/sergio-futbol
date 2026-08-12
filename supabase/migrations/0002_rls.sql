-- Row Level Security — activado en TODAS las tablas, sin excepción.
-- Los jugadores son menores de edad: nada es accesible sin autenticación,
-- y solo usuarios admin/staff (tabla public.usuarios) pueden leer/escribir.

-- Funciones helper "security definer": consultan public.usuarios sin pasar
-- por RLS, evitando la recursión de una política que consulta su propia tabla.
create function public.is_staff_or_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.usuarios
    where id = auth.uid() and activo and rol in ('admin', 'staff')
  );
$$;

create function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.usuarios
    where id = auth.uid() and activo and rol = 'admin'
  );
$$;

-- usuarios: cualquier admin/staff puede ver el listado; solo admin gestiona altas/bajas/roles.
alter table public.usuarios enable row level security;

create policy "usuarios_select_staff_admin" on public.usuarios
  for select using (public.is_staff_or_admin());

create policy "usuarios_insert_admin" on public.usuarios
  for insert with check (public.is_admin());

create policy "usuarios_update_admin" on public.usuarios
  for update using (public.is_admin()) with check (public.is_admin());

create policy "usuarios_delete_admin" on public.usuarios
  for delete using (public.is_admin());

-- Tablas de datos del equipo: admin y staff leen y escriben todo, nadie más accede.
alter table public.estados enable row level security;
create policy "estados_staff_admin_all" on public.estados
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

alter table public.jugadores enable row level security;
create policy "jugadores_staff_admin_all" on public.jugadores
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

alter table public.entrenamientos enable row level security;
create policy "entrenamientos_staff_admin_all" on public.entrenamientos
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

alter table public.asistencias_entrenamiento enable row level security;
create policy "asistencias_entrenamiento_staff_admin_all" on public.asistencias_entrenamiento
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

alter table public.partidos enable row level security;
create policy "partidos_staff_admin_all" on public.partidos
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

alter table public.convocatorias enable row level security;
create policy "convocatorias_staff_admin_all" on public.convocatorias
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

alter table public.alineaciones enable row level security;
create policy "alineaciones_staff_admin_all" on public.alineaciones
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

alter table public.eventos_partido enable row level security;
create policy "eventos_partido_staff_admin_all" on public.eventos_partido
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

alter table public.valoraciones_partido enable row level security;
create policy "valoraciones_partido_staff_admin_all" on public.valoraciones_partido
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

alter table public.valoraciones_jugador enable row level security;
create policy "valoraciones_jugador_staff_admin_all" on public.valoraciones_jugador
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

alter table public.lesiones enable row level security;
create policy "lesiones_staff_admin_all" on public.lesiones
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

-- solicitudes_acceso: cualquiera (incluso sin sesión) puede crear una solicitud
-- desde la página pública "Solicitar acceso"; solo admin puede verlas y resolverlas.
alter table public.solicitudes_acceso enable row level security;

create policy "solicitudes_acceso_insert_public" on public.solicitudes_acceso
  for insert with check (true);

create policy "solicitudes_acceso_select_admin" on public.solicitudes_acceso
  for select using (public.is_admin());

create policy "solicitudes_acceso_update_admin" on public.solicitudes_acceso
  for update using (public.is_admin()) with check (public.is_admin());
