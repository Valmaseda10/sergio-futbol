-- Para poder contar cuántas veces se ha trabajado cada ejercicio de la
-- biblioteca (la "nomenclatura" que categoriza la tarea) y sus minutos
-- totales, cada una de las 4 tareas de un entrenamiento puede enlazar
-- opcionalmente con un ejercicio de la biblioteca y llevar su duración.
-- El texto libre de tarea_N no cambia (sigue siendo lo que se ve en la
-- ficha del entrenamiento); el enlace a ejercicios es lo que permite sumar
-- veces y minutos de forma fiable, sin depender de comparar texto.

alter table public.entrenamientos
  add column tarea_1_ejercicio_id uuid references public.ejercicios (id) on delete set null,
  add column tarea_2_ejercicio_id uuid references public.ejercicios (id) on delete set null,
  add column tarea_3_ejercicio_id uuid references public.ejercicios (id) on delete set null,
  add column tarea_4_ejercicio_id uuid references public.ejercicios (id) on delete set null,
  add column tarea_1_minutos integer,
  add column tarea_2_minutos integer,
  add column tarea_3_minutos integer,
  add column tarea_4_minutos integer;
