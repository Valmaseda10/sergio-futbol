-- Resultados de todos los partidos de la liga (1ª Provincial Infantil, grupo León), leídos de las
-- actas de la federación (rutina de los lunes, scripts/rfcylf). Con ellos la app calcula la
-- clasificación y enseña, de cada equipo, sus partidos, resultados y su posición actual.
create table public.liga_partidos (
  id uuid primary key default gen_random_uuid(),
  jornada integer not null,
  fecha date,
  local text not null,
  visitante text not null,
  goles_local integer not null,
  goles_visitante integer not null,
  acta text not null unique,
  created_at timestamptz not null default now()
);

alter table public.liga_partidos enable row level security;
create policy "liga_partidos_staff_admin_all" on public.liga_partidos
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
