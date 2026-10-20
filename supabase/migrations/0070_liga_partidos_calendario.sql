-- El calendario de la liga (partidos por jugar) vive en la misma tabla que los resultados: un partido
-- sin goles apuntados es un partido por jugar. Las jornadas futuras no tienen acta en la federación,
-- así que un partido se identifica por jornada + local + visitante (y el acta se rellena cuando
-- aparece). Además, la hora del partido.
alter table public.liga_partidos alter column goles_local drop not null;
alter table public.liga_partidos alter column goles_visitante drop not null;
alter table public.liga_partidos alter column acta drop not null;
alter table public.liga_partidos add column if not exists hora text;
alter table public.liga_partidos add constraint liga_partidos_jornada_equipos_key unique (jornada, local, visitante);
