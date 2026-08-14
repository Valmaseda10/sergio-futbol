-- Módulo Vídeos: enlaces a grabaciones de partidos completos y clips,
-- alojados fuera de Supabase (YouTube/Drive) — solo se guarda la URL.

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  url text not null,
  tipo text not null check (tipo in ('partido', 'clip')),
  partido_id uuid references public.partidos (id) on delete set null,
  fecha date not null default current_date,
  notas text,
  created_at timestamptz not null default now()
);

alter table public.videos enable row level security;

create policy "videos_staff_admin_all" on public.videos
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
