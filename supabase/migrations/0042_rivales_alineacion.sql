-- Alineación que ha puesto el rival contra nosotros: fichas sueltas
-- (dorsal/nombre opcional + posición en el campo) igual que las fichas rival
-- del campograma, pero atadas al rival concreto en vez de a un campograma
-- genérico, para que se vean en su ficha de scouting.
create table public.rivales_alineacion (
  id uuid primary key default gen_random_uuid(),
  rival_id uuid not null references public.rivales_scouting (id) on delete cascade,
  nombre text,
  dorsal integer,
  posicion_jugada text,
  pos_x numeric not null,
  pos_y numeric not null,
  orden integer
);

alter table public.rivales_alineacion enable row level security;
create policy "rivales_alineacion_staff_admin_all" on public.rivales_alineacion
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
