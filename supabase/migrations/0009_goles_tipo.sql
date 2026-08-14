-- Desglose de goles por tipo de jugada, tanto a favor como en contra, para
-- el gráfico de Estadísticas.
create table public.goles_partido (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.partidos (id) on delete cascade,
  a_favor boolean not null,
  tipo_gol text not null check (
    tipo_gol in (
      'juego_asociativo',
      'transicion_ofensiva',
      'juego_vertical',
      'centro_lateral',
      'error_propio',
      'abp'
    )
  ),
  jugador_id uuid references public.jugadores (id) on delete set null,
  minuto integer,
  created_at timestamptz not null default now()
);

alter table public.goles_partido enable row level security;
create policy "goles_partido_staff_admin_all" on public.goles_partido
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
