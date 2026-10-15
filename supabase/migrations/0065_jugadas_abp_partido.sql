-- ABP por partido: una jugada de la biblioteca se copia para un partido concreto con
-- los jugadores de su convocatoria y alineación. La copia vive en la misma tabla, con
-- `partido_id` (se borra con el partido) y `origen_id` (la jugada de la biblioteca).
alter table public.jugadas_abp
  add column partido_id uuid references public.partidos(id) on delete cascade,
  add column origen_id uuid references public.jugadas_abp(id) on delete set null;

create index jugadas_abp_partido_idx on public.jugadas_abp (partido_id);
