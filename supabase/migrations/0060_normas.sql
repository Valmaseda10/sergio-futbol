-- Catálogo de faltas (régimen interno) editable desde la app: antes vivía
-- fijo en el código. Las multas ya puestas guardan su propio snapshot del
-- texto y los puntos, así que editar o borrar una norma no las cambia.
create table public.normas (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (categoria in ('entrenamiento', 'partido', 'generales')),
  texto text not null,
  puntos integer not null default 1 check (puntos between 1 and 10),
  orden integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.normas enable row level security;
create policy "normas_staff_admin_all" on public.normas
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

insert into public.normas (categoria, texto, puntos, orden) values
  ('entrenamiento', 'Llegar tarde a la convocatoria', 1, 1),
  ('entrenamiento', 'Llegar tarde al entrenamiento ya iniciado', 1, 2),
  ('entrenamiento', 'Olvidar material (botas, espinilleras, medias, camiseta, sudadera, agua...)', 1, 3),
  ('entrenamiento', 'Olvidar el foam / no hacer el wellness a tiempo', 1, 4),
  ('entrenamiento', 'No pasar el RPE-TQR', 1, 5),
  ('entrenamiento', 'Insultos, palabras malsonantes o protestas a un compañero o al cuerpo técnico', 1, 6),
  ('entrenamiento', 'Falta no justificada', 1, 7),
  ('partido', 'Llegar tarde a la convocatoria', 1, 8),
  ('partido', 'Olvidar material', 1, 9),
  ('partido', 'Olvidar el foam', 1, 10),
  ('partido', 'No pasar el RPE-TQR', 1, 11),
  ('partido', 'Insultos, palabras malsonantes o protestas a un compañero o al cuerpo técnico', 1, 12),
  ('partido', 'Tarjeta amarilla por desplazar el balón', 1, 13),
  ('partido', 'Tarjeta amarilla por protestar', 1, 14),
  ('partido', 'Tarjeta roja', 1, 15),
  ('generales', 'Entrenar con pendientes, cadenas o anillos', 1, 16),
  ('generales', 'Móvil en el vestuario (salvo para poner música)', 1, 17),
  ('generales', 'Excederse en el tiempo post-entreno', 1, 18),
  ('generales', 'Uniformidad no correspondiente', 1, 19);
