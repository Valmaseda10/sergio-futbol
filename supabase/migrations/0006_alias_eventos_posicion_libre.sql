-- Alias de jugador (nombre en el campo), nuevos tipos de evento de partido
-- (cambios y autogol) y posicionamiento libre de fichas en la alineación.

alter table public.jugadores
  add column alias text;

do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'eventos_partido'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%tipo%';

  if constraint_name is not null then
    execute format('alter table public.eventos_partido drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.eventos_partido
  add constraint eventos_partido_tipo_check check (
    tipo in (
      'gol', 'asistencia', 'tarjeta_amarilla', 'tarjeta_roja',
      'cambio_entra', 'cambio_sale', 'autogol'
    )
  );

alter table public.alineaciones
  add column pos_x numeric,
  add column pos_y numeric;
