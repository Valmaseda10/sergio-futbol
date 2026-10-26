-- Añade "En propia puerta" a los tipos de gol: gol a favor que marca un jugador del rival en su propia
-- portería (no hay goleador nuestro). Se cuenta como gol a favor y como categoría de gol en las estadísticas.
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
    'propia_puerta'
  )
);
