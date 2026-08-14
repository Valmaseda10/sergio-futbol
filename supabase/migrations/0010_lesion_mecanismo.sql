-- Distingue "qué se ha lesionado" (tipo) de "cómo se ha lesionado" (mecanismo).
alter table public.lesiones add column mecanismo text;
