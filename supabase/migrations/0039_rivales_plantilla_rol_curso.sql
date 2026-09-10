-- Dos añadidos a la plantilla del rival:
--  - "rol": distingue a los jugadores del cuerpo técnico (entrenador,
--    delegado), para poder listar el cuerpo técnico aparte en la ficha.
--  - "curso": dentro de Infantil, si el jugador es de 1er año (sube de
--    Alevín) o de 2º año. Da de un vistazo la veteranía del equipo rival.
alter table public.rivales_plantilla
  add column rol text not null default 'jugador',
  add column curso smallint;

alter table public.rivales_plantilla
  add constraint rivales_plantilla_rol_check
    check (rol in ('jugador', 'entrenador', 'delegado')),
  add constraint rivales_plantilla_curso_check
    check (curso is null or curso in (1, 2));
