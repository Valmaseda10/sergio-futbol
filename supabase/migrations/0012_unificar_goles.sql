-- Unifica el registro de goles: eventos_partido pasa a ser la única fuente
-- de verdad (antes existían dos vías independientes: goles_partido y
-- eventos_partido). jugador_id se permite nulo para los goles en contra
-- (gol del rival, sin jugador propio que anotar).
alter table public.eventos_partido alter column jugador_id drop not null;
alter table public.eventos_partido add column a_favor boolean not null default true;
alter table public.eventos_partido add column tipo_gol text check (
  tipo_gol in (
    'juego_asociativo',
    'transicion_ofensiva',
    'juego_vertical',
    'centro_lateral',
    'error_propio',
    'abp'
  )
);
alter table public.eventos_partido add column pos_x numeric;
alter table public.eventos_partido add column pos_y numeric;

drop table public.goles_partido;
