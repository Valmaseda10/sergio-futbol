-- Edu, cuarto entrenador: quién lleva cada tarea además de Campos, Paco y Felipe
-- (apartado "Roles entrenador" del entrenamiento y de su ficha imprimible).
alter table public.entrenamientos
  add column tarea_1_rol_edu text,
  add column tarea_2_rol_edu text,
  add column tarea_3_rol_edu text,
  add column tarea_4_rol_edu text;
