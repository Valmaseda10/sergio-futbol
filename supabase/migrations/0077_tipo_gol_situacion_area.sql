-- Añade "Situación en el área" a los tipos de gol (gol que llega de una acción dentro del área:
-- remate tras un barullo, rechace, segundo palo...). Se cuenta como una categoría más en las estadísticas.
alter table public.eventos_partido drop constraint eventos_partido_tipo_gol_check;
alter table public.eventos_partido add constraint eventos_partido_tipo_gol_check check (
  tipo_gol in (
    'juego_asociativo',
    'transicion_ofensiva',
    'juego_vertical',
    'centro_lateral',
    'error_propio',
    'abp',
    'situacion_1v1',
    'situacion_area',
    'propia_puerta'
  )
);
