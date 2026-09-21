-- Detalle extra de un gol:
-- - juego_asociativo_tipo: cuando tipo_gol = 'juego_asociativo', de dónde ha
--   venido (tiro exterior, centro lateral o rechace). Si es centro lateral
--   se usa el mismo par de puntos (pos_x/pos_y = remate, pos_x_centro/
--   pos_y_centro = origen del centro) que ya se usaba para tipo_gol =
--   'centro_lateral'.
-- - superficie_gol: con qué ha rematado, para cualquier gol.
alter table public.eventos_partido
  add column juego_asociativo_tipo text check (
    juego_asociativo_tipo in ('tiro_exterior', 'centro_lateral', 'rechace')
  ),
  add column superficie_gol text check (
    superficie_gol in ('pierna_derecha', 'pierna_izquierda', 'cabeza', 'otro')
  );
