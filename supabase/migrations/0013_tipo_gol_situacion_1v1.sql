-- Añade "Situación 1vs1" a los tipos de jugada de gol.
alter table public.eventos_partido drop constraint eventos_partido_tipo_gol_check;
alter table public.eventos_partido add constraint eventos_partido_tipo_gol_check check (
  tipo_gol in (
    'juego_asociativo',
    'transicion_ofensiva',
    'juego_vertical',
    'centro_lateral',
    'error_propio',
    'abp',
    'situacion_1v1'
  )
);
