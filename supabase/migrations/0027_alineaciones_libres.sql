-- Permite añadir a la alineación (inicial o final) de un partido un jugador
-- "solo por hoy" (invitado, de prueba...) escribiendo su nombre en vez de
-- elegirlo de la plantilla: jugador_id pasa a ser opcional y su nombre se
-- guarda en nombre_libre cuando no hay una fila real en `jugadores`.

alter table public.alineaciones
  alter column jugador_id drop not null,
  add column nombre_libre text,
  add constraint alineaciones_jugador_o_libre
    check (jugador_id is not null or nombre_libre is not null);

alter table public.alineaciones_finales
  alter column jugador_id drop not null,
  add column nombre_libre text,
  add constraint alineaciones_finales_jugador_o_libre
    check (jugador_id is not null or nombre_libre is not null);
