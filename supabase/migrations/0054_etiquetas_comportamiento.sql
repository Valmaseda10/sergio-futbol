alter table public.etiquetas
  add column requiere_jugador boolean not null default true,
  add column requiere_zona boolean not null default true;
