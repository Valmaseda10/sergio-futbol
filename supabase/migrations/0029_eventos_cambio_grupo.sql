-- Enlaza los dos eventos (cambio_sale + cambio_entra) que forman un mismo
-- cambio de jugador, para poder mostrarlos y borrarlos juntos desde el nuevo
-- apartado "Cambios" del partido en vez de como dos eventos sueltos sin
-- relación entre sí. No es una FK: solo un identificador compartido generado
-- al crear el par.
alter table public.eventos_partido
  add column cambio_grupo_id uuid;
