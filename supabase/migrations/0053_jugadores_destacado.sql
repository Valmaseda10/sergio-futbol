alter table public.jugadores
  add column destacado text check (destacado in ('destacado', 'debil'));
