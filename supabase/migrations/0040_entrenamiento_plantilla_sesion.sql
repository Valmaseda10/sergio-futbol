-- Campos para poder montar la sesión igual que la plantilla que se usaba en
-- PowerPoint (cabecera de la sesión + detalle D/E/T y objetivos DEF/OFE de
-- cada tarea), de forma que se pueda generar el PDF de la sesión desde la
-- propia app sin depender de PowerPoint.
--
-- "obj_semanal" no hace falta como columna nueva: es exactamente lo que ya
-- guarda "objetivos".
alter table public.entrenamientos
  add column rival_torneo text,
  add column microciclo text,
  add column bajas text,
  add column charla text,
  add column material text,
  add column tarea_1_dimension text,
  add column tarea_1_series text,
  add column tarea_1_tiempo text,
  add column tarea_1_objetivos_def text,
  add column tarea_1_objetivos_ofe text,
  add column tarea_2_dimension text,
  add column tarea_2_series text,
  add column tarea_2_tiempo text,
  add column tarea_2_objetivos_def text,
  add column tarea_2_objetivos_ofe text,
  add column tarea_3_dimension text,
  add column tarea_3_series text,
  add column tarea_3_tiempo text,
  add column tarea_3_objetivos_def text,
  add column tarea_3_objetivos_ofe text,
  add column tarea_4_dimension text,
  add column tarea_4_series text,
  add column tarea_4_tiempo text,
  add column tarea_4_objetivos_def text,
  add column tarea_4_objetivos_ofe text;
