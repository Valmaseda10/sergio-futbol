-- Capitanes: sus multas cuentan doble (x2) en el registro de Normas.
alter table public.jugadores
  add column es_capitan boolean not null default false;
