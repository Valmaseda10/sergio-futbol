-- Las jugadas de ABP se agrupan por tipo (córners y faltas directas / laterales
-- / frontales) para encontrarlas de un vistazo.
alter table public.jugadas_abp
  add column tipo text not null default 'corner'
  check (tipo in ('corner', 'falta_directa', 'falta_lateral', 'falta_frontal'));

-- Las ya importadas: el tipo se deduce del título.
update public.jugadas_abp set tipo = case
  when lower(nombre) like '%falta directa%' then 'falta_directa'
  when lower(nombre) like '%falta lateral%' then 'falta_lateral'
  when lower(nombre) like '%falta frontal%' then 'falta_frontal'
  else 'corner'
end;
