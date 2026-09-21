-- Régimen interno sin dinero: cada incumplimiento de una norma suma puntos a
-- un jugador (texto y puntos guardados como snapshot de la norma en ese
-- momento, para que el historial no cambie si el catálogo se retoca luego).
-- Al llegar a un umbral el jugador cumple un castigo (recoger material o
-- traer algo para compartir) y se marcan sus multas como resueltas.
create table public.multas (
  id uuid primary key default gen_random_uuid(),
  jugador_id uuid not null references public.jugadores(id) on delete cascade,
  categoria text not null check (categoria in ('entrenamiento', 'partido', 'generales')),
  norma text not null,
  puntos integer not null,
  fecha date not null default current_date,
  resuelta boolean not null default false,
  notas text,
  created_at timestamptz not null default now()
);

create index multas_jugador_id_idx on public.multas(jugador_id);

alter table public.multas enable row level security;
create policy "multas_staff_admin_all" on public.multas
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
