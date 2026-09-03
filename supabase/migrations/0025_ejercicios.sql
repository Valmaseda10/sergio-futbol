-- Biblioteca de ejercicios reutilizables: en vez de escribir cada Tarea del
-- entrenamiento desde cero cada semana, se pueden guardar aquí y elegir de
-- una lista al planificar la sesión.

create table public.ejercicios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  created_at timestamptz not null default now()
);

alter table public.ejercicios enable row level security;
create policy "ejercicios_staff_admin_all" on public.ejercicios
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
