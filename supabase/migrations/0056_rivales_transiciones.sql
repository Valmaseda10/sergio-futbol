-- Transición ofensiva (qué hacen al recuperar el balón) y transición
-- defensiva (qué hacen al perderlo), junto a fase ofensiva/defensiva en las
-- notas rápidas del rival.
alter table public.rivales_scouting
  add column transicion_ofensiva text,
  add column transicion_defensiva text;
