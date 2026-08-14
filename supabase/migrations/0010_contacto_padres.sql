-- Sustituye el contacto genérico por contacto separado de padre y madre.
alter table public.jugadores add column contacto_padre_nombre text;
alter table public.jugadores add column contacto_padre_telefono text;
alter table public.jugadores add column contacto_madre_nombre text;
alter table public.jugadores add column contacto_madre_telefono text;

alter table public.jugadores drop column contacto_nombre;
alter table public.jugadores drop column contacto_telefono;
