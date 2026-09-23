-- Hojas de partido (u otros documentos) subidas a mano para cada rival, con
-- lo apuntado durante los partidos jugados contra ellos. Puede haber varias
-- por rival (ida/vuelta, distintas competiciones), a diferencia de la foto
-- del rival (rivales_scouting.foto_url), que es un único campo.
create table public.rivales_documentos (
  id uuid primary key default gen_random_uuid(),
  rival_id uuid not null references public.rivales_scouting(id) on delete cascade,
  nombre text not null,
  archivo_url text not null,
  created_at timestamptz not null default now()
);

alter table public.rivales_documentos enable row level security;
create policy "rivales_documentos_staff_admin_all" on public.rivales_documentos
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
