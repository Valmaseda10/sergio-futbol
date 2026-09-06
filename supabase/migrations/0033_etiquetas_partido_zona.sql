-- Zona del campo (opcional) donde ha pasado lo etiquetado, elegida tocando
-- un campograma en miniatura — igual que ya se hace con la ubicación de los
-- goles en Eventos.
alter table public.etiquetas_partido
  add column pos_x numeric,
  add column pos_y numeric;
