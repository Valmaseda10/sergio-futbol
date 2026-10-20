-- Competición de los viernes: "derecha" e "izquierda" son el PERFIL desde el que se golpea la falta
-- (mirando a la portería), no la pierna. Cada intento que entra vale 1 punto si se mete con la pierna
-- dominante del jugador y 2 con la menos dominante; un fallo no se guarda (casilla vacía).
alter table public.competicion_viernes drop constraint if exists competicion_viernes_tipo_check;
alter table public.competicion_viernes drop constraint if exists competicion_viernes_puntos_check;
delete from public.competicion_viernes where puntos = 0;
update public.competicion_viernes set tipo = 'perfil_derecho' where tipo = 'pierna_derecha';
update public.competicion_viernes set tipo = 'perfil_izquierdo' where tipo = 'pierna_izquierda';
alter table public.competicion_viernes add constraint competicion_viernes_tipo_check
  check (tipo in ('perfil_derecho', 'perfil_izquierdo', 'penalti'));
alter table public.competicion_viernes add constraint competicion_viernes_puntos_check
  check (puntos between 1 and 2);
