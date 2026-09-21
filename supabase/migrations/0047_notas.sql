-- Notas: apuntes libres del cuerpo técnico en el dashboard de Inicio (algo
-- que recoger, comentarle a un jugador, comprobar...), compartidas entre
-- admin y staff. Mismo patrón que recordatorios, pero sin marcar como hecho:
-- es solo una libreta rápida.
create table public.notas (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  created_at timestamptz not null default now()
);

alter table public.notas enable row level security;
create policy "notas_staff_admin_all" on public.notas
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
