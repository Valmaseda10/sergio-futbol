-- Añade "1vs1" a de dónde ha venido un gol de juego asociativo (junto a tiro exterior, centro
-- lateral y rechace).
alter table public.eventos_partido drop constraint if exists eventos_partido_juego_asociativo_tipo_check;
alter table public.eventos_partido add constraint eventos_partido_juego_asociativo_tipo_check check (
  juego_asociativo_tipo in ('tiro_exterior', 'centro_lateral', 'rechace', '1vs1')
);
