-- Plantilla completa de un rival: los jugadores que tiene dados de alta esta
-- temporada (se consultan a mano en la ficha del club de la app de la
-- federación, no hay forma de sacarlo automáticamente), con su historial de
-- la temporada anterior para tener contexto de scouting: en qué categoría
-- jugó, con qué equipo y cómo quedó ese equipo. Distinto de
-- rivales_jugadores_destacados (que es solo un resumen de quién es top/flojo
-- para el partido): esto es el listado íntegro de la plantilla.
create table public.rivales_plantilla (
  id uuid primary key default gen_random_uuid(),
  rival_id uuid not null references public.rivales_scouting (id) on delete cascade,
  nombre text not null,
  dorsal integer,
  equipo_temporada_anterior text,
  categoria_temporada_anterior text,
  clasificacion_temporada_anterior text,
  notas text,
  created_at timestamptz not null default now()
);

alter table public.rivales_plantilla enable row level security;
create policy "rivales_plantilla_staff_admin_all" on public.rivales_plantilla
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
