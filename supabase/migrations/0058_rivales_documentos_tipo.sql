-- Distingue las hojas de partido (apuntadas tras jugar contra el rival) del
-- documento PrePartido (preparado antes del partido, para exponer al
-- equipo) — ambos viven en la misma tabla de documentos del rival, solo
-- cambia el tipo para poder listarlos por separado en la ficha.
alter table public.rivales_documentos
  add column tipo text not null default 'hoja_partido'
    check (tipo in ('hoja_partido', 'pre_partido'));
