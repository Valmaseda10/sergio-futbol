-- Permite enlazar un vídeo a un evento concreto del partido (gol, tarjeta,
-- asistencia...) y al segundo exacto del vídeo en que ocurre, para poder
-- saltar directamente a ese instante al reproducirlo.
alter table public.videos add column evento_id uuid references public.eventos_partido (id) on delete set null;
alter table public.videos add column segundo_inicio integer;
