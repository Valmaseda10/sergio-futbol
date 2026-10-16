-- Presentación de partido: las diapositivas (estilo PowerPoint) que se enseñan o imprimen
-- el día antes del partido, en la sesión de vídeo. Una por partido; `diapositivas` guarda la
-- lista de diapositivas (formato en src/lib/presentacion-partido.ts).
create table public.presentaciones_partido (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null unique references public.partidos(id) on delete cascade,
  diapositivas jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.presentaciones_partido enable row level security;
create policy "presentaciones_partido_staff_admin_all" on public.presentaciones_partido
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
