-- Capitán de cada partido: permite ver en la ficha del jugador (y en Plantilla → Capitanes)
-- en qué partidos ha sido capitán. Distinto de jugadores.es_capitan, que solo marca a los
-- capitanes del equipo para duplicar sus multas.
alter table public.partidos
  add column capitan_id uuid references public.jugadores (id) on delete set null;
