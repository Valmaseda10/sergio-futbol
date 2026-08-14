-- Subtipo de ABP (córner, falta lateral, falta directa, saque de banda,
-- penalti) y punto de origen del centro cuando el tipo de jugada es
-- "centro_lateral" (pos_x/pos_y siguen representando desde dónde ha sido
-- el gol en sí).
alter table public.eventos_partido add column abp_tipo text check (
  abp_tipo in ('corner', 'falta_lateral', 'falta_directa', 'saque_banda', 'penalti')
);
alter table public.eventos_partido add column pos_x_centro numeric;
alter table public.eventos_partido add column pos_y_centro numeric;
