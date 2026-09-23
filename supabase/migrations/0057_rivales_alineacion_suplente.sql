-- Marca qué fichas de la alineación que puso el rival contra nosotros
-- entraron desde el banquillo (para resaltarlas en rojo en el campograma),
-- a diferencia de las que empezaron de titulares.
alter table public.rivales_alineacion
  add column suplente boolean not null default false;
