-- Trabajo extra que no forma parte de ninguna de las 4 tareas con diagrama
-- (p.ej. un repaso de ABP al final de la sesión): se describe a mano en el
-- campo "notas" de la sesión, pero necesita categoría y minutos propios
-- para que sí cuente en el resumen de "Tareas trabajadas".

alter table public.entrenamientos
  add column extra_categoria text check (
    extra_categoria in (
      'activacion', 'ataque_defensas', 'doble_areas', 'defensa',
      'posesion', 'finalizacion', 'partidos', 'rueda_pases', 'abp',
      'plan_partido'
    )
  ),
  add column extra_minutos integer;
