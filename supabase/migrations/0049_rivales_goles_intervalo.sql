-- Goles a favor/en contra de cada rival por tramos de minutos, apuntados a
-- mano viendo sus actas/resultados (no hay forma de sacarlo automático de
-- la web de la federación — ver comentario en 0038_rivales_plantilla.sql).
-- Una fila por tramo y rival, para verlo y descargarlo debajo de su
-- plantilla de cara al informe pre-partido.
create table public.rivales_goles_intervalo (
  id uuid primary key default gen_random_uuid(),
  rival_id uuid not null references public.rivales_scouting(id) on delete cascade,
  intervalo text not null check (intervalo in ('0-15', '15-30', '30-45', '45-60', '60+')),
  goles_favor integer not null default 0,
  goles_contra integer not null default 0,
  unique (rival_id, intervalo)
);

alter table public.rivales_goles_intervalo enable row level security;
create policy "rivales_goles_intervalo_staff_admin_all" on public.rivales_goles_intervalo
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
