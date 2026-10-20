-- Goles y tarjetas de cada partido de la liga, leídos de las actas de la federación (rutina de los
-- lunes). Con ellos la app saca los goleadores de la liga y de cada rival, y las tarjetas (quién está
-- apercibido o sancionado). `jugador` es el nombre tal como sale en el acta.
--   tipo: gol, gol_penalti, gol_propia (en propia puerta: lo marca el jugador de `equipo` pero cuenta
--         para el rival), amarilla, doble_amarilla, roja
create table public.liga_eventos (
  id uuid primary key default gen_random_uuid(),
  jornada integer not null,
  acta text not null,
  equipo text not null,
  jugador text not null,
  tipo text not null,
  minuto integer,
  created_at timestamptz not null default now(),
  unique (acta, tipo, jugador, minuto)
);

alter table public.liga_eventos enable row level security;
create policy "liga_eventos_staff_admin_all" on public.liga_eventos
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
