-- Enlaza cada jugador destacado (top/flojo) con su fila real en la
-- plantilla del rival, en vez de ser un nombre suelto sin relación: así el
-- entrenador elige de la plantilla ya cargada en vez de volver a teclear el
-- nombre y el dorsal (y arriesgarse a que no coincidan). nombre/dorsal se
-- siguen guardando como antes para los casos en los que el jugador aún no
-- está de alta en la plantilla.
alter table public.rivales_jugadores_destacados
  add column plantilla_id uuid references public.rivales_plantilla (id) on delete set null;
