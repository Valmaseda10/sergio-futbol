-- Lote de funcionalidades: equipo anterior, documento de entrenamiento,
-- foto de rival, nuevos estados de asistencia, sesiones de readaptación de
-- lesiones y scouting de rivales.

-- Jugadores: equipo del que procede el jugador.
alter table public.jugadores add column equipo_anterior text;

-- Entrenamientos: foto o documento (PDF) adjunto a la sesión.
alter table public.entrenamientos add column documento_url text;

-- Partidos: foto del equipo rival.
alter table public.partidos add column foto_rival_url text;

-- Estados de asistencia a entrenamiento: LESIÓN pasa a estar disponible al
-- pasar lista (antes solo tipo 'general'); se añaden viaje, fatiga/descanso
-- y estudios. AMISTOSO y VACACIONES quedan fuera del selector de asistencia
-- al ser tipo 'general'.
update public.estados set tipo = 'entrenamiento' where nombre = 'LESIÓN';

insert into public.estados (nombre, color, tipo) values
  ('VIAJE', '#3b82f6', 'entrenamiento'),
  ('FATIGA/DESCANSO', '#eab308', 'entrenamiento'),
  ('ESTUDIOS', '#8b5cf6', 'entrenamiento');

-- Registro de sesiones de readaptación tras una lesión.
create table public.lesion_sesiones_readaptacion (
  id uuid primary key default gen_random_uuid(),
  lesion_id uuid not null references public.lesiones (id) on delete cascade,
  fecha date not null default current_date,
  horario text,
  notas text,
  created_at timestamptz not null default now()
);

alter table public.lesion_sesiones_readaptacion enable row level security;
create policy "lesion_sesiones_readaptacion_staff_admin_all" on public.lesion_sesiones_readaptacion
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

-- Scouting de rivales.
create table public.rivales_scouting (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  foto_url text,
  sistema_juego text,
  fase_ofensiva text,
  fase_defensiva text,
  abp text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rivales_scouting enable row level security;
create policy "rivales_scouting_staff_admin_all" on public.rivales_scouting
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

create trigger rivales_scouting_set_updated_at
  before update on public.rivales_scouting
  for each row
  execute function public.set_updated_at();

create table public.rivales_jugadores_destacados (
  id uuid primary key default gen_random_uuid(),
  rival_id uuid not null references public.rivales_scouting (id) on delete cascade,
  nombre text not null,
  dorsal integer,
  categoria text not null check (categoria in ('top', 'flojo')),
  notas text,
  created_at timestamptz not null default now()
);

alter table public.rivales_jugadores_destacados enable row level security;
create policy "rivales_jugadores_destacados_staff_admin_all" on public.rivales_jugadores_destacados
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

-- Bucket privado compartido para fotos/documentos de entrenamientos, partidos
-- y scouting (los jugadores ya tienen su propio bucket "jugadores").
insert into storage.buckets (id, name, public)
values ('adjuntos', 'adjuntos', false)
on conflict (id) do nothing;

create policy "adjuntos_storage_select_staff_admin" on storage.objects
  for select using (bucket_id = 'adjuntos' and public.is_staff_or_admin());

create policy "adjuntos_storage_insert_staff_admin" on storage.objects
  for insert with check (bucket_id = 'adjuntos' and public.is_staff_or_admin());

create policy "adjuntos_storage_update_staff_admin" on storage.objects
  for update using (bucket_id = 'adjuntos' and public.is_staff_or_admin())
  with check (bucket_id = 'adjuntos' and public.is_staff_or_admin());

create policy "adjuntos_storage_delete_staff_admin" on storage.objects
  for delete using (bucket_id = 'adjuntos' and public.is_staff_or_admin());
