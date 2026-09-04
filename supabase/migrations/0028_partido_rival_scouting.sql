-- Vincula un partido con su ficha de scouting en Rivales (opcional), para
-- poder ver el resumen del rival directamente desde el partido sin tener
-- que buscarlo aparte en la sección Rivales.
alter table public.partidos
  add column rival_scouting_id uuid references public.rivales_scouting (id) on delete set null;
