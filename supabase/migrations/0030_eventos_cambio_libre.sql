-- Permite registrar la salida de un jugador "solo por hoy" (alineación
-- libre, sin ficha en Plantilla) en un cambio: como no tiene fila en
-- jugadores, jugador_id se deja a null y su nombre se guarda aquí, igual
-- que ya hace alineaciones con nombre_libre.
alter table public.eventos_partido
  add column nombre_libre text;
