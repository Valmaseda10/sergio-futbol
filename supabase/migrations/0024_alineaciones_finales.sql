-- Once que termina el partido: alineación independiente de la inicial, para
-- poder editarla a mano (y compararla con la inicial) además de partir del
-- cálculo automático a partir de los cambios registrados en Eventos.

create table public.alineaciones_finales (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.partidos (id) on delete cascade,
  jugador_id uuid not null references public.jugadores (id) on delete cascade,
  titular boolean not null default false,
  posicion_jugada text,
  pos_x numeric,
  pos_y numeric,
  unique (partido_id, jugador_id)
);

alter table public.alineaciones_finales enable row level security;
create policy "alineaciones_finales_staff_admin_all" on public.alineaciones_finales
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
