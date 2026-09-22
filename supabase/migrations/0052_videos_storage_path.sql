-- Permite subir un clip como archivo propio (bucket "adjuntos") en vez de
-- enlazar un vídeo de YouTube. Solo pensado para clips cortos, no partidos
-- enteros: el plan gratuito de Supabase Storage es limitado. Cuando
-- storage_path está informado, url se deja vacío ("") y el reproductor usa
-- el archivo en vez de intentar interpretar una URL de YouTube.
alter table public.videos add column storage_path text;
