-- Horario semanal de entrenamientos, configurable desde Ajustes en vez de
-- ir grabado en el código de "Generar entrenamientos". dia_semana sigue el
-- mismo convenio que DIAS_SEMANA en el cliente: 0 = domingo … 6 = sábado.
create table public.horario_entrenamiento (
  id uuid primary key default gen_random_uuid(),
  dia_semana int not null check (dia_semana between 0 and 6),
  hora_inicio time,
  hora_fin time,
  lugar text,
  created_at timestamptz not null default now(),
  unique (dia_semana)
);

alter table public.horario_entrenamiento enable row level security;
create policy "horario_entrenamiento_staff_admin_all" on public.horario_entrenamiento
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

insert into public.horario_entrenamiento (dia_semana, hora_inicio, hora_fin, lugar) values
  (1, '17:45', '19:15', 'Área Deportiva de Puente Castro'),
  (3, '17:45', '19:15', 'Área Deportiva de Puente Castro'),
  (5, '17:45', '19:15', 'Área Deportiva de Puente Castro');
