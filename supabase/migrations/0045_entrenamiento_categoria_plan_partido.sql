-- Nueva categoría de tarea "Plan de Partido" (charla táctica sobre el
-- rival/próximo partido), se añade a la lista cerrada existente.

alter table public.entrenamientos
  drop constraint entrenamientos_tarea_1_categoria_check,
  drop constraint entrenamientos_tarea_2_categoria_check,
  drop constraint entrenamientos_tarea_3_categoria_check,
  drop constraint entrenamientos_tarea_4_categoria_check;

alter table public.entrenamientos
  add constraint entrenamientos_tarea_1_categoria_check check (
    tarea_1_categoria in (
      'activacion', 'ataque_defensas', 'doble_areas', 'defensa',
      'posesion', 'finalizacion', 'partidos', 'rueda_pases', 'abp',
      'plan_partido'
    )
  ),
  add constraint entrenamientos_tarea_2_categoria_check check (
    tarea_2_categoria in (
      'activacion', 'ataque_defensas', 'doble_areas', 'defensa',
      'posesion', 'finalizacion', 'partidos', 'rueda_pases', 'abp',
      'plan_partido'
    )
  ),
  add constraint entrenamientos_tarea_3_categoria_check check (
    tarea_3_categoria in (
      'activacion', 'ataque_defensas', 'doble_areas', 'defensa',
      'posesion', 'finalizacion', 'partidos', 'rueda_pases', 'abp',
      'plan_partido'
    )
  ),
  add constraint entrenamientos_tarea_4_categoria_check check (
    tarea_4_categoria in (
      'activacion', 'ataque_defensas', 'doble_areas', 'defensa',
      'posesion', 'finalizacion', 'partidos', 'rueda_pases', 'abp',
      'plan_partido'
    )
  );
