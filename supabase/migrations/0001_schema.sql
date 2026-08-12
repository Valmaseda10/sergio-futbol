-- Esquema completo Infantil B — Fase 1 (scaffold)
-- Orden de creación respetando dependencias de claves foráneas.

create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  email text not null unique,
  rol text not null check (rol in ('admin', 'staff')),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.estados (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  color text not null,
  tipo text not null check (tipo in ('entrenamiento', 'general')),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.jugadores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  apellidos text not null,
  dorsal integer,
  posicion text,
  pierna_dominante text check (
    pierna_dominante in ('izquierda', 'derecha', 'ambidiestro')
  ),
  fecha_nacimiento date,
  foto_url text,
  contacto_nombre text,
  contacto_telefono text,
  contacto_email text,
  notas_medicas text,
  fecha_alta date not null default current_date,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.entrenamientos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  hora_inicio time,
  hora_fin time,
  lugar text,
  objetivos text,
  ejercicios text,
  notas text,
  created_at timestamptz not null default now()
);

create table public.asistencias_entrenamiento (
  id uuid primary key default gen_random_uuid(),
  entrenamiento_id uuid not null references public.entrenamientos (id) on delete cascade,
  jugador_id uuid not null references public.jugadores (id) on delete cascade,
  estado_id uuid references public.estados (id) on delete set null,
  notas text,
  unique (entrenamiento_id, jugador_id)
);

create table public.partidos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  hora time,
  competicion text not null check (competicion in ('liga', 'amistoso', 'copa')),
  rival text not null,
  local_visitante text not null check (local_visitante in ('local', 'visitante')),
  lugar text,
  resultado_favor integer,
  resultado_contra integer,
  notas text,
  created_at timestamptz not null default now()
);

create table public.convocatorias (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.partidos (id) on delete cascade,
  jugador_id uuid not null references public.jugadores (id) on delete cascade,
  convocado boolean not null default true,
  motivo_no_convocado text,
  unique (partido_id, jugador_id)
);

create table public.alineaciones (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.partidos (id) on delete cascade,
  jugador_id uuid not null references public.jugadores (id) on delete cascade,
  titular boolean not null default false,
  posicion_jugada text,
  minuto_entra integer,
  minuto_sale integer,
  unique (partido_id, jugador_id)
);

create table public.eventos_partido (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.partidos (id) on delete cascade,
  jugador_id uuid not null references public.jugadores (id) on delete cascade,
  tipo text not null check (
    tipo in ('gol', 'asistencia', 'tarjeta_amarilla', 'tarjeta_roja')
  ),
  minuto integer
);

create table public.valoraciones_partido (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.partidos (id) on delete cascade,
  valoracion_general text,
  rating_equipo integer check (rating_equipo between 1 and 10)
);

create table public.valoraciones_jugador (
  id uuid primary key default gen_random_uuid(),
  jugador_id uuid not null references public.jugadores (id) on delete cascade,
  fecha date not null default current_date,
  tecnica integer check (tecnica between 1 and 10),
  fisico integer check (fisico between 1 and 10),
  tactica integer check (tactica between 1 and 10),
  actitud integer check (actitud between 1 and 10),
  notas text
);

create table public.lesiones (
  id uuid primary key default gen_random_uuid(),
  jugador_id uuid not null references public.jugadores (id) on delete cascade,
  fecha_inicio date not null,
  tipo text not null,
  fecha_prevista_alta date,
  fecha_alta_real date,
  notas text
);

create table public.solicitudes_acceso (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text not null,
  mensaje text,
  fecha_solicitud timestamptz not null default now(),
  estado text not null default 'pendiente' check (
    estado in ('pendiente', 'aprobado', 'rechazado')
  )
);
