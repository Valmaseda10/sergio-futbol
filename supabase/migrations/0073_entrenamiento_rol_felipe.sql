-- Felipe, tercer entrenador: quién lleva cada tarea además de Campos y Paco
-- (apartado "Roles entrenador" del entrenamiento y de su ficha imprimible).
alter table public.entrenamientos
  add column tarea_1_rol_felipe text,
  add column tarea_2_rol_felipe text,
  add column tarea_3_rol_felipe text,
  add column tarea_4_rol_felipe text;
