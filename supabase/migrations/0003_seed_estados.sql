-- Estados iniciales, equivalentes a los códigos del Excel actual.
-- Editables después desde Ajustes (Fase 6) — esto es solo un punto de partida.

insert into public.estados (nombre, color, tipo) values
  ('SI', '#22c55e', 'entrenamiento'),
  ('IA', '#ef4444', 'entrenamiento'),
  ('VACACIONES', '#3b82f6', 'general'),
  ('LESIÓN', '#f97316', 'general'),
  ('AMISTOSO', '#a855f7', 'general');
