-- Tareas guardadas: una tarea completa (texto, objetivos, rotación, diagrama
-- dibujado e imagen) que se guarda una vez para reutilizarla en otras
-- sesiones sin volver a escribirla ni dibujarla. `datos` lleva los campos de
-- la tarea y el diagrama; `imagen_url` es la ruta del PNG en el bucket
-- "adjuntos" (tareas-guardadas/<id>.png).
create table public.tareas_guardadas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  datos jsonb not null default '{}'::jsonb,
  imagen_url text,
  created_at timestamptz not null default now()
);

alter table public.tareas_guardadas enable row level security;
create policy "tareas_guardadas_staff_admin_all" on public.tareas_guardadas
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
