-- Ubicación en el campo desde donde se ha producido el gol (coordenadas
-- porcentuales, igual que en alineaciones.pos_x/pos_y).
alter table public.goles_partido add column pos_x numeric;
alter table public.goles_partido add column pos_y numeric;
