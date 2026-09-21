-- Separa los partidos entre pretemporada y liga (competición ya distingue
-- liga/amistoso/copa, pero un amistoso también puede darse a media
-- temporada; esto es una clasificación aparte, editable a mano).
alter table public.partidos
  add column fase text not null default 'liga' check (fase in ('pretemporada', 'liga'));

-- Backfill razonable para partidos ya existentes: los amistosos se asumen
-- de pretemporada salvo que se corrija a mano en su ficha.
update public.partidos set fase = 'pretemporada' where competicion = 'amistoso';
