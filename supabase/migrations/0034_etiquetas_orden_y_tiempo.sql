-- Orden personalizable de las categorías de tagueo (para poder moverlas con
-- flechas arriba/abajo en el panel), y precisión de minuto+segundo y parte
-- (1ª/2ª) en cada registro de tagueo.

alter table public.etiquetas
  add column orden integer not null default 0;

-- Backfill: asigna un orden inicial distinto a las categorías ya existentes
-- (por nombre) para que las flechas de mover tengan algo con qué intercambiar.
with ordenado as (
  select id, row_number() over (order by nombre) - 1 as rn
  from public.etiquetas
)
update public.etiquetas e
set orden = ordenado.rn
from ordenado
where e.id = ordenado.id;

alter table public.etiquetas_partido
  add column segundo integer,
  add column parte smallint not null default 1;
