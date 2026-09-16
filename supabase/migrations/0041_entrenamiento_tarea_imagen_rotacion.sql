-- Más campos de la plantilla de sesión, los que faltaban de la 0040: la
-- imagen del ejercicio (el diagrama de la tarea, la foto de la pizarra...),
-- la rotación de jugadores por grupos, las reglas de provocación y las
-- observaciones — uno de cada por tarea, igual que en la plantilla.
alter table public.entrenamientos
  add column tarea_1_imagen_url text,
  add column tarea_1_rotacion text,
  add column tarea_1_reglas_provocacion text,
  add column tarea_1_observaciones text,
  add column tarea_2_imagen_url text,
  add column tarea_2_rotacion text,
  add column tarea_2_reglas_provocacion text,
  add column tarea_2_observaciones text,
  add column tarea_3_imagen_url text,
  add column tarea_3_rotacion text,
  add column tarea_3_reglas_provocacion text,
  add column tarea_3_observaciones text,
  add column tarea_4_imagen_url text,
  add column tarea_4_rotacion text,
  add column tarea_4_reglas_provocacion text,
  add column tarea_4_observaciones text;
