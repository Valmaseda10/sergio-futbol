-- Apartado genérico de etiquetado: un panel de control editable (definido
-- aquí como una lista de etiquetas con nombre y color, gestionable desde
-- Ajustes igual que los estados de asistencia) para ir marcando sobre la
-- marcha lo que va pasando en cada partido (presión alta, pérdida,
-- recuperación, falta cometida... lo que el cuerpo técnico quiera definir),
-- sin necesidad de tocar código para añadir una etiqueta nueva.

create table public.etiquetas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  color text not null default '#8a1b24',
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.etiquetas enable row level security;
create policy "etiquetas_staff_admin_all" on public.etiquetas
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

-- Cada toque de una etiqueta durante un partido: opcionalmente atribuido a
-- un jugador concreto (si no, se entiende que es del equipo en general), con
-- minuto y una nota corta, ambos opcionales.
create table public.etiquetas_partido (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.partidos (id) on delete cascade,
  etiqueta_id uuid not null references public.etiquetas (id) on delete cascade,
  jugador_id uuid references public.jugadores (id) on delete set null,
  minuto integer,
  notas text,
  created_at timestamptz not null default now()
);

alter table public.etiquetas_partido enable row level security;
create policy "etiquetas_partido_staff_admin_all" on public.etiquetas_partido
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
