-- Campograma: alineaciones guardadas y reutilizables (no atadas a un
-- partido concreto, a diferencia de `alineaciones`) — el entrenador crea
-- las que quiera, con sus 11 titulares y suplentes, y las va editando.
-- Mismo patrón de coordenadas porcentuales que alineaciones.pos_x/pos_y.
create table public.campogramas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campograma_jugadores (
  id uuid primary key default gen_random_uuid(),
  campograma_id uuid not null references public.campogramas (id) on delete cascade,
  jugador_id uuid not null references public.jugadores (id) on delete cascade,
  titular boolean not null default false,
  posicion_jugada text,
  pos_x numeric,
  pos_y numeric,
  orden integer,
  unique (campograma_id, jugador_id)
);

create trigger campogramas_set_updated_at
  before update on public.campogramas
  for each row
  execute function public.set_updated_at();

alter table public.campogramas enable row level security;
alter table public.campograma_jugadores enable row level security;

create policy "campogramas_staff_admin_all" on public.campogramas
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

create policy "campograma_jugadores_staff_admin_all" on public.campograma_jugadores
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

-- Sesión de vídeo: varios clips ya guardados, reproducidos seguidos para
-- enseñárselos a los jugadores de un tirón. No hay archivo nuevo que
-- generar (los clips siguen siendo YouTube con marcas de tiempo): solo se
-- guarda el orden en el que se reproducen.
create table public.videos_sesiones (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  notas text,
  created_at timestamptz not null default now()
);

create table public.videos_sesion_clips (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.videos_sesiones (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  orden integer not null default 0,
  unique (sesion_id, video_id)
);

alter table public.videos_sesiones enable row level security;
alter table public.videos_sesion_clips enable row level security;

create policy "videos_sesiones_staff_admin_all" on public.videos_sesiones
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

create policy "videos_sesion_clips_staff_admin_all" on public.videos_sesion_clips
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
