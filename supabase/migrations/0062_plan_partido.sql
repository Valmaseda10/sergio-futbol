-- Plan de partido: ABP (jugadas a balón parado dibujadas) y hoja de partido
-- (alineaciones, cambios y análisis del rival), antes en PowerPoint y Word.
--
-- jugadas_abp.diagrama lleva el dibujo (mismo formato que los diagramas de las
-- tareas) y .jugadores la lista numerada de quién hace qué en la jugada.
create table public.jugadas_abp (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  fase text not null default 'ofensivo' check (fase in ('ofensivo', 'defensivo')),
  diagrama jsonb,
  jugadores jsonb not null default '[]'::jsonb,
  notas text,
  orden integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.jugadas_abp enable row level security;
create policy "jugadas_abp_staff_admin_all" on public.jugadas_abp
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

-- Una hoja por partido; `datos` guarda todo el contenido editable de la hoja
-- (formato en src/lib/hoja-partido.ts).
create table public.hojas_partido (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null unique references public.partidos(id) on delete cascade,
  datos jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.hojas_partido enable row level security;
create policy "hojas_partido_staff_admin_all" on public.hojas_partido
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
