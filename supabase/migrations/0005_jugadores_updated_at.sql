-- Mantiene jugadores.updated_at al día automáticamente en cada edición.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger jugadores_set_updated_at
  before update on public.jugadores
  for each row
  execute function public.set_updated_at();
