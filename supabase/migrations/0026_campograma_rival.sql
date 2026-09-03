-- Alineación del rival dentro de un campograma, para poder colocarla junto a
-- la propia y compararlas. Los jugadores del rival no existen en
-- `jugadores` (son de otro equipo), así que aquí se escriben a mano en vez
-- de referenciar una fila real.

create table public.campograma_rivales (
  id uuid primary key default gen_random_uuid(),
  campograma_id uuid not null references public.campogramas (id) on delete cascade,
  nombre text not null,
  dorsal integer,
  posicion_jugada text,
  pos_x numeric,
  pos_y numeric,
  orden integer
);

alter table public.campograma_rivales enable row level security;
create policy "campograma_rivales_staff_admin_all" on public.campograma_rivales
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
