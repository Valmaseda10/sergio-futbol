-- Sustituye el campo libre "ejercicios" por 4 tareas independientes, para
-- poder mostrarlas como bloques separados (Tarea 1, Tarea 2, Tarea 3, Tarea 4)
-- al planificar la sesión y al consultarla el día del entrenamiento.

alter table public.entrenamientos
  add column tarea_1 text,
  add column tarea_2 text,
  add column tarea_3 text,
  add column tarea_4 text;

update public.entrenamientos
  set tarea_1 = ejercicios
  where ejercicios is not null;

alter table public.entrenamientos
  drop column ejercicios;
