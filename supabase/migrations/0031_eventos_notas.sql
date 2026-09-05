-- Nota corta opcional al añadir un evento (de momento solo se usa para
-- goles, a favor o en contra, pero se deja genérica en la tabla).
alter table public.eventos_partido
  add column notas text;
