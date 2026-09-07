-- Categoría fija para cada una de las 4 tareas de un entrenamiento (lista
-- cerrada definida por el cuerpo técnico), independiente de la biblioteca de
-- ejercicios: permite contar veces trabajadas y minutos por categoría para
-- CUALQUIER tarea, esté o no tomada de la biblioteca.

alter table public.entrenamientos
  add column tarea_1_categoria text check (
    tarea_1_categoria in (
      'activacion', 'ataque_defensas', 'doble_areas', 'defensa',
      'posesion', 'finalizacion', 'partidos', 'rueda_pases', 'abp'
    )
  ),
  add column tarea_2_categoria text check (
    tarea_2_categoria in (
      'activacion', 'ataque_defensas', 'doble_areas', 'defensa',
      'posesion', 'finalizacion', 'partidos', 'rueda_pases', 'abp'
    )
  ),
  add column tarea_3_categoria text check (
    tarea_3_categoria in (
      'activacion', 'ataque_defensas', 'doble_areas', 'defensa',
      'posesion', 'finalizacion', 'partidos', 'rueda_pases', 'abp'
    )
  ),
  add column tarea_4_categoria text check (
    tarea_4_categoria in (
      'activacion', 'ataque_defensas', 'doble_areas', 'defensa',
      'posesion', 'finalizacion', 'partidos', 'rueda_pases', 'abp'
    )
  );
