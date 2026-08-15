-- Colores de la equipación del rival (camiseta, pantalón, medias), para el
-- nuevo apartado "Rivales" (antes "Scouting" dentro de Partidos).
alter table public.rivales_scouting
  add column color_camiseta text,
  add column color_pantalon text,
  add column color_medias text;
