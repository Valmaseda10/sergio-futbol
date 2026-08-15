-- Recordatorios: notas/tareas libres del cuerpo técnico en el dashboard de
-- Inicio (comprar petos, llamar al árbitro, etc.), compartidas entre admin y staff.
create table public.recordatorios (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  completado boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.recordatorios enable row level security;
create policy "recordatorios_staff_admin_all" on public.recordatorios
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
