-- Competición de los viernes: cada jugador golpea una falta con la pierna derecha, otra con la
-- izquierda y un penalti, en varias rondas. Meter vale 1 punto, fallar 0 y meter con la pierna
-- no dominante vale doble (la app propone el 2 según la pierna dominante; se guarda el valor que se
-- apunte, 0, 1 o 2). Una fila por intento; sin fila = todavía no ha tirado.
create table public.competicion_viernes (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  ronda integer not null check (ronda >= 1),
  jugador_id uuid not null references public.jugadores(id) on delete cascade,
  tipo text not null check (tipo in ('pierna_derecha', 'pierna_izquierda', 'penalti')),
  puntos smallint not null check (puntos between 0 and 2),
  created_at timestamptz not null default now(),
  unique (fecha, ronda, jugador_id, tipo)
);

alter table public.competicion_viernes enable row level security;
create policy "competicion_viernes_staff_admin_all" on public.competicion_viernes
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
