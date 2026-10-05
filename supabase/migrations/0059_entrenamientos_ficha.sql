-- Datos de la ficha de sesión que no encajan en columnas sueltas: nº de
-- sesión y recuento de convocados de la cabecera, tabla de objetivos
-- (psicológico/táctico/técnico/físico) y diagramas dibujados en la propia
-- app. Va en un único jsonb para no multiplicar columnas; el formato lo
-- define src/lib/ficha-entrenamiento.ts.
alter table public.entrenamientos
  add column ficha jsonb;
