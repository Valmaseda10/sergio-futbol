-- Quién de los dos entrenadores (Campos/Paco) lleva cada tarea, igual que
-- la fila "Campos: / Paco:" que hay bajo cada columna TAREA en la plantilla.
alter table public.entrenamientos
  add column tarea_1_rol_campos text,
  add column tarea_1_rol_paco text,
  add column tarea_2_rol_campos text,
  add column tarea_2_rol_paco text,
  add column tarea_3_rol_campos text,
  add column tarea_3_rol_paco text,
  add column tarea_4_rol_campos text,
  add column tarea_4_rol_paco text;
