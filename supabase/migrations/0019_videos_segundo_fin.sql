-- Segundo de fin, para poder acotar un clip a un tramo concreto del vídeo
-- original (start/end en el embed de YouTube) en vez de solo un punto de
-- inicio.
alter table public.videos add column segundo_fin integer;
